/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { getEsqlSourceTargets, type EsqlSourceTarget } from '../../common/ai_index_source';
import type { AiIndexAutomation, AiIndexSaveWarning } from '../../common/http_api/ai_indices';
import type { AiIndexChangeEvent, AiIndexChangeHandler } from '../ai_indices/changes';
import type { AiIndexService } from '../ai_indices/service';
import { AUTOMATION_TEMPLATE_TAGS, renderIndexMetadataTemplate, setWorkflowName } from './render';
import { saveWorkflowToAiIndex, type SaveWorkflowApi } from './save_workflow';

export const SOURCE_AUTOMATIONS_CHANGE_HANDLER_ID = 'index_metadata_source_automations';

const MAX_AUTOMATION_NAME_LENGTH = 200;
const NAME_PREFIX = 'Index metadata: ';
const HASH_LENGTH = 8;
const MAX_CATEGORY_CANDIDATES = 20;
const MAX_CATEGORY_CARDINALITY = 50;
const CATEGORY_SAMPLE_ROWS = 10_000;
const CATEGORY_TYPES: ReadonlySet<string> = new Set(['keyword', 'constant_keyword']);
const CATEGORY_NAME_PATTERN =
  /(^|[._])(category|type|kind|status|state|level|severity|class|group|tier|segment|service|dataset|action|outcome|priority)$/i;
const IDENTIFIER_NAME_PATTERN = /(^|[._])(id|uuid|guid|hash|key|_id)$/i;

/** The workflows management API that source automations install and remove workflows with. */
export interface AutomationWorkflowsApi extends SaveWorkflowApi {
  getWorkflow(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ id?: string; name?: string; tags?: string[] } | null>;
}

export interface SourceAutomationsDependencies {
  logger: Logger;
  getAiIndexService: () => AiIndexService;
  /** Resolves to `undefined` without workflows management. */
  getWorkflowsManagement: () => Promise<AutomationWorkflowsApi | undefined>;
  /** Whether the request may create, update, or delete workflows in the space. */
  canManageWorkflows: (
    request: KibanaRequest,
    spaceId: string,
    operation: 'create' | 'update' | 'delete'
  ) => Promise<boolean>;
  /** An Elasticsearch client acting as the user who saved the AI index. */
  getScopedEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
}

interface EsqlSource {
  type: 'esql';
  value: string;
}

interface SourceContext {
  event: AiIndexChangeEvent;
  workflowsManagement: AutomationWorkflowsApi;
  automations: readonly AiIndexAutomation[];
}

const esqlSourcesOf = (sources: ReadonlyArray<{ type: string; value: string }> | undefined) =>
  (sources ?? []).filter((source): source is EsqlSource => source.type === 'esql');

/** The index expressions an ES|QL source reads with `FROM` or `TS`; joined and enriched ones are not profiled. */
const readTargetsOf = (query: string): EsqlSourceTarget[] =>
  getEsqlSourceTargets(query).filter(({ command }) => command === 'from' || command === 'ts');

/**
 * The name of the automation an ES|QL source gets: the indices it reads and a hash of its query.
 */
export const sourceAutomationName = (query: string): string => {
  const hash = createHash('sha256').update(query.trim()).digest('hex').slice(0, HASH_LENGTH);
  const suffix = ` (${hash})`;
  const targets =
    readTargetsOf(query)
      .map(({ prefix, index }) => (prefix === undefined ? index : `${prefix}:${index}`))
      .join(', ') || 'ES|QL source';
  const room = MAX_AUTOMATION_NAME_LENGTH - NAME_PREFIX.length - suffix.length;
  const shown = targets.length > room ? `${targets.slice(0, room - 1)}…` : targets;
  return `${NAME_PREFIX}${shown}${suffix}`.replace(/\//g, '-');
};

/**
 * Orders category field candidates, lowest first. A category-like name outweighs any cardinality,
 * and among equally named candidates the one closest to 10 distinct values wins: a handful of
 * groups reads well in an overview, and the bounds already rule out a constant or an identifier.
 */
const rankOf = (name: string, distinct: number): number =>
  (CATEGORY_NAME_PATTERN.test(name) ? 0 : 1000) + Math.abs(distinct - 10);

/** What reading the indices of an ES|QL source turned up. */
export interface SourceInspection {
  /** Whether any index matched, and the user can read it. */
  matched: boolean;
  /** Documents among the first rows of the source. */
  documents: number;
  /**
   * The aggregatable keyword field to group by: one with 2 to 50 distinct values in a sample of
   * the rows, preferring names like `status` or `category`. Missing when none qualifies.
   */
  categoryField?: string;
}

export const inspectSource = async (
  esClient: ElasticsearchClient,
  targets: readonly string[]
): Promise<SourceInspection> => {
  const caps = await esClient.fieldCaps({
    index: [...targets],
    fields: '*',
    ignore_unavailable: true,
    allow_no_indices: true,
  });
  if ([caps.indices].flat().filter(Boolean).length === 0) {
    return { matched: false, documents: 0 };
  }
  const candidates = Object.entries(caps.fields)
    .filter(
      ([name, types]) =>
        !name.startsWith('_') &&
        !IDENTIFIER_NAME_PATTERN.test(name) &&
        Object.entries(types).every(
          ([type, capability]) => CATEGORY_TYPES.has(type) && capability.aggregatable
        )
    )
    .map(([name]) => name)
    .sort(
      (a, b) =>
        Number(!CATEGORY_NAME_PATTERN.test(a)) - Number(!CATEGORY_NAME_PATTERN.test(b)) ||
        (a < b ? -1 : 1)
    )
    .slice(0, MAX_CATEGORY_CANDIDATES);
  const quote = (field: string) => `\`${field.replace(/`/g, '``')}\``;
  const { columns, values } = await esClient.esql.query({
    query: `FROM ${targets
      .map((target) => `"${target}"`)
      .join(', ')} | LIMIT ${CATEGORY_SAMPLE_ROWS} | STATS ${[
      'total = COUNT(*)',
      ...candidates.map((field, index) => `c${index} = COUNT_DISTINCT(${quote(field)})`),
    ].join(', ')}`,
  });
  const [row] = values;
  const numberOf = (column: string): number | undefined => {
    const value = row?.[columns.findIndex(({ name }) => name === column)];
    return typeof value === 'number' ? value : undefined;
  };
  const documents = numberOf('total') ?? 0;
  const counted = candidates.flatMap((field, index) => {
    const distinct = numberOf(`c${index}`);
    return distinct !== undefined && distinct >= 2 && distinct <= MAX_CATEGORY_CARDINALITY
      ? [{ field, distinct }]
      : [];
  });
  counted.sort((a, b) => rankOf(a.field, a.distinct) - rankOf(b.field, b.distinct));
  return { matched: true, documents, categoryField: counted[0]?.field };
};

const findTemplateWorkflowId = async (
  { event: { spaceId, request }, workflowsManagement, automations }: SourceContext,
  name: string
): Promise<string | undefined> => {
  for (const { type, value } of automations) {
    if (type !== 'workflow') {
      continue;
    }
    const workflow = await workflowsManagement.getWorkflow(value, spaceId, request);
    if (
      workflow?.name === name &&
      workflow.tags?.includes(AUTOMATION_TEMPLATE_TAGS.index_metadata)
    ) {
      return workflow.id ?? value;
    }
  }
  return undefined;
};

/** Installs the automation of a source; resolves to why it was not installed, when it was not. */
const installForSource = async (
  deps: SourceAutomationsDependencies,
  context: SourceContext,
  { value }: EsqlSource
): Promise<string | undefined> => {
  const { logger, getAiIndexService } = deps;
  const { workflowsManagement } = context;
  const { aiIndexId, spaceId, request } = context.event;
  const name = sourceAutomationName(value);
  const skip = (reason: string) => {
    logger.warn(`Did not install "${name}" on AI index '${aiIndexId}': ${reason}`);
    return reason;
  };
  const reads = readTargetsOf(value);
  if (reads.length === 0) {
    return skip('The query reads no index with FROM or TS, so there is nothing to profile.');
  }
  if (reads.some(({ prefix }) => prefix !== undefined)) {
    return skip('The query reads a remote cluster, which is not profiled.');
  }
  const targets = reads.map(({ index }) => index);
  const { matched, documents, categoryField } = await inspectSource(
    await deps.getScopedEsClient(request),
    targets
  );
  if (!matched) {
    return skip(
      `No index matching ${targets.join(', ')} was found, or you do not have read access to it.`
    );
  }
  if (documents === 0) {
    return skip(
      `${targets.join(
        ', '
      )} has no documents yet, so there is nothing to profile. Remove the source and add it again once it has data.`
    );
  }
  const yaml = setWorkflowName(
    renderIndexMetadataTemplate({
      aiIndexId,
      automationName: name,
      sources: [{ index: targets.join(','), categoryField }],
    }),
    name
  );

  const existing = await findTemplateWorkflowId(context, name);
  const requireAccess = (operation: 'create' | 'update') => async () => {
    if (!(await deps.canManageWorkflows(request, spaceId, operation))) {
      throw new Error(
        `you cannot ${operation} workflows, so "${name}" was not ${
          operation === 'create' ? 'installed' : 'updated'
        }`
      );
    }
  };
  const result = await saveWorkflowToAiIndex({
    aiIndexId,
    workflowYaml: yaml,
    existingWorkflowId: existing,
    request,
    spaceId,
    logger,
    getAiIndexService: async () => getAiIndexService(),
    workflowsManagement,
    access: { assertCanCreate: requireAccess('create'), assertCanUpdate: requireAccess('update') },
  });
  const outcome = `${
    existing ? 'Updated' : 'Installed'
  } "${name}" on AI index '${aiIndexId}' in space '${spaceId}' as workflow '${result.workflowId}'`;
  if (result.valid === false) {
    logger.warn(`${outcome}, but it is not valid`);
    return `The automation was saved but is not valid, so it cannot be enabled or run${
      result.validationErrors?.length ? `: ${result.validationErrors.join('; ')}` : '.'
    }`;
  }
  logger.info(`${outcome}${categoryField ? `, grouped by '${categoryField}'` : ''}`);
};

/**
 * Detaches the automation of a source from the AI index, then deletes its workflow when the user
 * may. Resolves to why the workflow was kept, when it was.
 */
const removeForSource = async (
  deps: SourceAutomationsDependencies,
  context: SourceContext,
  { value }: EsqlSource
): Promise<string | undefined> => {
  const { logger, getAiIndexService } = deps;
  const { workflowsManagement } = context;
  const { aiIndexId, spaceId, request } = context.event;
  const name = sourceAutomationName(value);
  const workflowId = await findTemplateWorkflowId(context, name);
  if (!workflowId) {
    return;
  }
  await getAiIndexService().removeAutomation(aiIndexId, spaceId, {
    type: 'workflow',
    value: workflowId,
  });
  if (!(await deps.canManageWorkflows(request, spaceId, 'delete'))) {
    logger.warn(
      `Detached "${name}" from AI index '${aiIndexId}' with its source; the user who saved it cannot delete workflows, so workflow '${workflowId}' was kept`
    );
    return `The automation was detached, but its workflow '${workflowId}' was kept because you cannot delete workflows.`;
  }
  let failure: string | undefined;
  try {
    const { failures } = await workflowsManagement.deleteWorkflows([workflowId], spaceId, request);
    failure = failures.map(({ error }) => error).join('; ') || undefined;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  if (failure) {
    throw new Error(`workflow '${workflowId}' was detached but could not be deleted: ${failure}`);
  }
  logger.info(
    `Removed "${name}" from AI index '${aiIndexId}' in space '${spaceId}' with its source, and deleted workflow '${workflowId}'`
  );
};

/**
 * Installs the index metadata automation template for each ES|QL source added to an AI index, and
 * removes the one of each source taken off it. A source whose query changed is both. Managed and
 * deleted AI indices are skipped. Resolves to a warning for each source whose automation was not
 * installed or removed.
 */
export const reconcileSourceAutomations = async (
  deps: SourceAutomationsDependencies,
  event: AiIndexChangeEvent
): Promise<AiIndexSaveWarning[]> => {
  const { previous, current, aiIndexId } = event;
  if (!current || current.managed) {
    return [];
  }
  const previousSources = esqlSourcesOf(previous?.sources);
  const currentSources = esqlSourcesOf(current.sources);
  const keysOf = (sources: EsqlSource[]) => new Set(sources.map(({ value }) => value.trim()));
  const before = keysOf(previousSources);
  const after = keysOf(currentSources);
  const removed = previousSources.filter(({ value }) => !after.has(value.trim()));
  const added = currentSources.filter(({ value }) => !before.has(value.trim()));
  if (removed.length === 0 && added.length === 0) {
    return [];
  }
  const workflowsManagement = await deps.getWorkflowsManagement();
  if (!workflowsManagement) {
    deps.logger.debug(
      `Workflows management is not available: AI index '${aiIndexId}' gets no source automations`
    );
    return [];
  }
  const context: SourceContext = {
    event,
    workflowsManagement,
    automations: [
      ...new Map(
        [...(previous?.automations ?? []), ...current.automations].map((automation) => [
          `${automation.type}:${automation.value}`,
          automation,
        ])
      ).values(),
    ],
  };

  const warnings: AiIndexSaveWarning[] = [];
  const attempt = async (
    source: EsqlSource,
    action: 'install' | 'remove',
    run: () => Promise<string | undefined | void>
  ) => {
    let message: string | undefined;
    try {
      message = (await run()) || undefined;
    } catch (error) {
      message = `The index metadata automation could not be ${
        action === 'install' ? 'installed' : 'removed'
      }: ${error instanceof Error ? error.message : String(error)}`;
      deps.logger.warn(
        `Failed to ${action} "${sourceAutomationName(
          source.value
        )}" on AI index '${aiIndexId}': ${message}`
      );
    }
    if (message) {
      warnings.push({ source: { type: 'esql', value: source.value }, message });
    }
  };
  for (const source of removed) {
    await attempt(source, 'remove', () => removeForSource(deps, context, source));
  }
  for (const source of added) {
    await attempt(source, 'install', () => installForSource(deps, context, source));
  }
  return warnings;
};

/** The AI index change handler that keeps one index metadata automation per ES|QL source. */
export const createSourceAutomationsChangeHandler = (
  deps: SourceAutomationsDependencies
): AiIndexChangeHandler => ({
  id: SOURCE_AUTOMATIONS_CHANGE_HANDLER_ID,
  fields: ['sources'],
  onChange: (event) => reconcileSourceAutomations(deps, event),
});
