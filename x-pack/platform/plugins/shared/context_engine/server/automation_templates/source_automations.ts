/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { Parser, mutate } from '@elastic/esql';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AiIndexChangeEvent, AiIndexChangeHandler } from '../ai_indices/changes';
import type { AiIndexService } from '../ai_indices/service';
import { AUTOMATION_TEMPLATE_TAGS, renderIndexMetadataTemplate } from './render';

export const SOURCE_AUTOMATIONS_CHANGE_HANDLER_ID = 'index_metadata_source_automations';

/** Same cap as the automation names agents give templates. */
const MAX_AUTOMATION_NAME_LENGTH = 200;
const NAME_PREFIX = 'Index metadata: ';
const HASH_LENGTH = 8;
const MAX_CATEGORY_CANDIDATES = 20;
/** A category field groups the index into a handful of values: at most this many. */
const MAX_CATEGORY_CARDINALITY = 50;
const CATEGORY_TYPES: ReadonlySet<string> = new Set(['keyword', 'constant_keyword']);
/** Field names that usually hold the category an analyst groups an index by first. */
const CATEGORY_NAME_PATTERN =
  /(^|[._])(category|type|kind|status|state|level|severity|class|group|tier|segment|service|dataset|action|outcome|priority)$/i;
/** Field names that usually hold an identifier, which never makes a good category. */
const IDENTIFIER_NAME_PATTERN = /(^|[._])(id|uuid|guid|hash|key|_id)$/i;

/** Duck-typed so Context Engine does not depend on `@kbn/workflows-management-plugin` (Moon cycle). */
export interface AutomationWorkflowsApi {
  getWorkflow(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ id?: string; name?: string; tags?: string[] } | null>;
  createWorkflow(
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ id: string; valid: boolean }>;
  updateWorkflow(
    workflowId: string,
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ valid: boolean }>;
  deleteWorkflows(workflowIds: string[], spaceId: string, request: KibanaRequest): Promise<unknown>;
}

export interface SourceAutomationsDependencies {
  logger: Logger;
  getAiIndexService: () => AiIndexService;
  /** Resolves to `undefined` without workflows management. */
  getWorkflowsManagement: () => Promise<AutomationWorkflowsApi | undefined>;
  /** Whether the request may create, or delete, workflows in the space. */
  canManageWorkflows: (
    request: KibanaRequest,
    spaceId: string,
    operation: 'create' | 'delete'
  ) => Promise<boolean>;
  /** An Elasticsearch client acting as the user who saved the AI index. */
  getScopedEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
}

interface EsqlSource {
  type: 'esql';
  value: string;
}

type SourceEvent = Pick<AiIndexChangeEvent, 'aiIndexId' | 'spaceId' | 'request'>;

const esqlSourcesOf = (sources: ReadonlyArray<{ type: string; value: string }> | undefined) =>
  (sources ?? []).filter((source): source is EsqlSource => source.type === 'esql');

/** The index expressions in the `FROM` of an ES|QL source, or none when it does not parse. */
export const esqlSourceTargets = (query: string): string[] => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return [];
  }
  return [...mutate.commands.from.sources.list(root)]
    .map((source) => source.index?.valueUnquoted ?? source.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
};

/**
 * The name of the automation a source gets: what it reads, and a hash of its query, so two
 * sources reading the same indices with different queries get their own automation.
 */
export const sourceAutomationName = (query: string): string => {
  const hash = createHash('sha256').update(query.trim()).digest('hex').slice(0, HASH_LENGTH);
  const suffix = ` (${hash})`;
  const targets = esqlSourceTargets(query).join(', ') || 'ES|QL source';
  const room = MAX_AUTOMATION_NAME_LENGTH - NAME_PREFIX.length - suffix.length;
  const shown = targets.length > room ? `${targets.slice(0, room - 1)}…` : targets;
  return `${NAME_PREFIX}${shown}${suffix}`.replace(/\//g, '-');
};

const rankOf = (name: string, distinct: number): number =>
  (CATEGORY_NAME_PATTERN.test(name) ? 0 : 1000) + Math.abs(distinct - 10);

/**
 * The keyword field an index is best grouped by: an aggregatable keyword field with a few
 * distinct values, preferring names like `status` or `category`. Undefined when none qualifies.
 */
export const chooseCategoryField = async (
  esClient: ElasticsearchClient,
  targets: readonly string[]
): Promise<string | undefined> => {
  const caps = await esClient.fieldCaps({
    index: [...targets],
    fields: '*',
    ignore_unavailable: true,
    allow_no_indices: true,
  });
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
  if (candidates.length === 0) {
    return undefined;
  }
  const quote = (field: string) => `\`${field.replace(/`/g, '``')}\``;
  const { columns, values } = await esClient.esql.query({
    query: `FROM ${targets.map((target) => `"${target}"`).join(', ')} | STATS ${candidates
      .map((field, index) => `c${index} = COUNT_DISTINCT(${quote(field)})`)
      .join(', ')}`,
  });
  const [row] = values;
  const distinctOf = (index: number): number | undefined => {
    const column = columns.findIndex(({ name }) => name === `c${index}`);
    const value = row?.[column];
    return typeof value === 'number' ? value : undefined;
  };
  const counted = candidates.flatMap((field, index) => {
    const distinct = distinctOf(index);
    return distinct !== undefined && distinct >= 2 && distinct <= MAX_CATEGORY_CARDINALITY
      ? [{ field, distinct }]
      : [];
  });
  counted.sort((a, b) => rankOf(a.field, a.distinct) - rankOf(b.field, b.distinct));
  return counted[0]?.field;
};

/** The workflow attached to the AI index that the index metadata template installed under a name. */
const findTemplateWorkflowId = async (
  { getAiIndexService }: SourceAutomationsDependencies,
  workflowsManagement: AutomationWorkflowsApi,
  { aiIndexId, spaceId, request }: SourceEvent,
  name: string
): Promise<string | undefined> => {
  const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
  for (const { type, value } of aiIndex.automations) {
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

const installForSource = async (
  deps: SourceAutomationsDependencies,
  workflowsManagement: AutomationWorkflowsApi,
  event: SourceEvent,
  { value }: EsqlSource
): Promise<void> => {
  const { logger, getAiIndexService } = deps;
  const { aiIndexId, spaceId, request } = event;
  const name = sourceAutomationName(value);
  const targets = esqlSourceTargets(value);
  if (targets.length === 0) {
    logger.warn(
      `Did not install "${name}" on AI index '${aiIndexId}': its ES|QL source has no FROM to profile`
    );
    return;
  }
  const categoryField = await chooseCategoryField(await deps.getScopedEsClient(request), targets);
  if (!categoryField) {
    logger.warn(
      `Did not install "${name}" on AI index '${aiIndexId}': ${targets.join(
        ', '
      )} has no keyword field with ${MAX_CATEGORY_CARDINALITY} or fewer values to group it by`
    );
    return;
  }
  const yaml = renderIndexMetadataTemplate({
    aiIndexId,
    automationName: name,
    sources: [{ index: targets.join(','), categoryField }],
  }).replace(/^name: .*/m, `name: ${JSON.stringify(name)}`);

  const existing = await findTemplateWorkflowId(deps, workflowsManagement, event, name);
  if (existing) {
    await workflowsManagement.updateWorkflow(existing, { yaml }, spaceId, request);
    logger.info(`Updated "${name}" on AI index '${aiIndexId}' in space '${spaceId}'`);
    return;
  }
  if (!(await deps.canManageWorkflows(request, spaceId, 'create'))) {
    throw new Error(
      `the user who saved the AI index cannot create workflows, so "${name}" was not installed`
    );
  }
  const aiIndexService = getAiIndexService();
  await aiIndexService.assertCanAcceptAutomation(aiIndexId, spaceId);
  const { id: workflowId } = await workflowsManagement.createWorkflow({ yaml }, spaceId, request);
  try {
    await aiIndexService.addAutomation(aiIndexId, spaceId, { type: 'workflow', value: workflowId });
  } catch (error) {
    await workflowsManagement.deleteWorkflows([workflowId], spaceId, request).catch(() => {
      logger.warn(`Failed to roll back workflow '${workflowId}' after attaching it failed`);
    });
    throw error;
  }
  logger.info(
    `Installed "${name}" on AI index '${aiIndexId}' in space '${spaceId}' as workflow '${workflowId}', grouped by '${categoryField}'`
  );
};

const removeForSource = async (
  deps: SourceAutomationsDependencies,
  workflowsManagement: AutomationWorkflowsApi,
  event: SourceEvent,
  { value }: EsqlSource
): Promise<void> => {
  const { logger, getAiIndexService } = deps;
  const { aiIndexId, spaceId, request } = event;
  const name = sourceAutomationName(value);
  const workflowId = await findTemplateWorkflowId(deps, workflowsManagement, event, name);
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
    return;
  }
  await workflowsManagement.deleteWorkflows([workflowId], spaceId, request);
  logger.info(
    `Removed "${name}" from AI index '${aiIndexId}' in space '${spaceId}' with its source, and deleted workflow '${workflowId}'`
  );
};

/**
 * Installs the index metadata automation template for each ES|QL source added to an AI index, and
 * removes the one of each source taken off it. A source whose query changed is both. Managed AI
 * indices take no automations; a deleted AI index has its automations deleted with it.
 */
export const reconcileSourceAutomations = async (
  deps: SourceAutomationsDependencies,
  event: AiIndexChangeEvent
): Promise<void> => {
  const { previous, current, aiIndexId } = event;
  if (!current || current.managed) {
    return;
  }
  const before = new Set(esqlSourcesOf(previous?.sources).map(({ value }) => value.trim()));
  const after = new Set(esqlSourcesOf(current.sources).map(({ value }) => value.trim()));
  const removed = esqlSourcesOf(previous?.sources).filter(({ value }) => !after.has(value.trim()));
  const added = esqlSourcesOf(current.sources).filter(({ value }) => !before.has(value.trim()));
  if (removed.length === 0 && added.length === 0) {
    return;
  }
  const workflowsManagement = await deps.getWorkflowsManagement();
  if (!workflowsManagement) {
    deps.logger.debug(
      `Workflows management is not available: AI index '${aiIndexId}' gets no source automations`
    );
    return;
  }

  const failures: string[] = [];
  const attempt = async (label: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  for (const source of removed) {
    await attempt(`removing "${sourceAutomationName(source.value)}"`, () =>
      removeForSource(deps, workflowsManagement, event, source)
    );
  }
  for (const source of added) {
    await attempt(`installing "${sourceAutomationName(source.value)}"`, () =>
      installForSource(deps, workflowsManagement, event, source)
    );
  }
  if (failures.length > 0) {
    throw new Error(failures.join('; '));
  }
};

/** Keeps one index metadata automation per ES|QL source of an AI index as its sources change. */
export const createSourceAutomationsChangeHandler = (
  deps: SourceAutomationsDependencies
): AiIndexChangeHandler => ({
  id: SOURCE_AUTOMATIONS_CHANGE_HANDLER_ID,
  fields: ['sources'],
  onChange: (event) => reconcileSourceAutomations(deps, event),
});
