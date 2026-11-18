/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { Parser, mutate } from '@elastic/esql';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { AiIndexChangeEvent, AiIndexChangeHandler } from '@kbn/context-engine-plugin/server';
import {
  findInstalledTemplateWorkflowIdByName,
  installAutomationTemplate,
  type InstallAutomationTemplateDependencies,
} from './install_automation_template';
import { MAX_AUTOMATION_NAME_LENGTH } from './template_params';

export const SOURCE_AUTOMATIONS_CHANGE_HANDLER_ID = 'index_metadata_source_automations';

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

interface EsqlSource {
  type: 'esql';
  value: string;
}

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

export interface SourceAutomationsDependencies extends InstallAutomationTemplateDependencies {
  /** An Elasticsearch client acting as the user who saved the AI index. */
  getScopedEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
}

const installForSource = async (
  deps: SourceAutomationsDependencies,
  { aiIndexId, spaceId, request }: Pick<AiIndexChangeEvent, 'aiIndexId' | 'spaceId' | 'request'>,
  { value }: EsqlSource
): Promise<void> => {
  const { logger } = deps;
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
  const result = await installAutomationTemplate({
    ...deps,
    aiIndexId,
    spaceId,
    request,
    params: {
      template: 'index_metadata',
      name,
      sources: [{ index: targets.join(','), categoryField }],
    },
  });
  logger.info(
    `${
      result.replaced ? 'Reinstalled' : 'Installed'
    } "${name}" on AI index '${aiIndexId}' in space '${spaceId}' as workflow '${
      result.workflowId
    }', grouped by '${categoryField}'`
  );
};

const removeForSource = async (
  deps: SourceAutomationsDependencies,
  { aiIndexId, spaceId, request }: Pick<AiIndexChangeEvent, 'aiIndexId' | 'spaceId' | 'request'>,
  { value }: EsqlSource
): Promise<void> => {
  const { logger, getAiIndexService, getWorkflowsManagement } = deps;
  const name = sourceAutomationName(value);
  const workflowId = await findInstalledTemplateWorkflowIdByName({
    aiIndexId,
    spaceId,
    request,
    template: 'index_metadata',
    name,
    logger,
    getAiIndexService,
    getWorkflowsManagement,
  });
  if (!workflowId) {
    return;
  }
  await (
    await getAiIndexService()
  ).removeAutomation(aiIndexId, spaceId, { type: 'workflow', value: workflowId });
  await getWorkflowsManagement().deleteWorkflows([workflowId], spaceId, request);
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
  const { previous, current } = event;
  if (!current || current.managed) {
    return;
  }
  const before = new Set(esqlSourcesOf(previous?.sources).map(({ value }) => value.trim()));
  const after = new Set(esqlSourcesOf(current.sources).map(({ value }) => value.trim()));
  const failures: string[] = [];
  const attempt = async (label: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  for (const source of esqlSourcesOf(previous?.sources)) {
    if (!after.has(source.value.trim())) {
      await attempt(`removing "${sourceAutomationName(source.value)}"`, () =>
        removeForSource(deps, event, source)
      );
    }
  }
  for (const source of esqlSourcesOf(current.sources)) {
    if (!before.has(source.value.trim())) {
      await attempt(`installing "${sourceAutomationName(source.value)}"`, () =>
        installForSource(deps, event, source)
      );
    }
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
