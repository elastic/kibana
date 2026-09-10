/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import type {
  IndicesIndexSettings,
  IndicesIndexTemplate,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Resolves the newest backing index of a data stream from Elasticsearch.
 *
 * Always prefer this over composing `.ds-<name>-<date>-NNNNNN` by hand: a
 * locally-derived date is wrong for any run that straddles UTC midnight.
 */
export const getWriteBackingIndexName = async (
  esClient: EsClient,
  dataStreamName: string
): Promise<string> => {
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: dataStreamName,
  });

  const indices = dataStreams[0]?.indices ?? [];
  if (indices.length === 0) {
    throw new Error(`Data stream ${dataStreamName} has no backing indices`);
  }

  return indices[indices.length - 1].index_name;
};

/** Resolves every backing index of a data stream, oldest first. */
export const getBackingIndexNames = async (
  esClient: EsClient,
  dataStreamName: string
): Promise<string[]> => {
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: dataStreamName,
  });

  return (dataStreams[0]?.indices ?? []).map(({ index_name: indexName }) => indexName);
};

export const setDataStreamSettings = async (
  esClient: EsClient,
  name: string,
  settings: IndicesIndexSettings
) => esClient.indices.putSettings({ index: name, settings });

/**
 * Makes documents rejected into a data stream's failure store searchable. Call it after
 * ingesting them and before asserting: `refreshAfterIndex` covers `logs-*-*` but not the
 * `.fs-*` indices behind `<data stream>::failures`, so counts are otherwise racy.
 *
 * A missing failure store is not an error, and closed backing indices are skipped —
 * some specs close one to verify it is excluded from counts, and refreshing it would
 * raise `index_closed_exception`.
 */
export const refreshFailureStore = async (esClient: EsClient, dataStream: string) =>
  esClient.indices.refresh(
    {
      index: `${dataStream}::failures`,
      ignore_unavailable: true,
      expand_wildcards: 'open',
    },
    { ignore: [404] }
  );

export const rolloverDataStream = async (esClient: EsClient, name: string) => {
  try {
    return await esClient.indices.rollover({ alias: name });
  } catch (error) {
    throw new Error(`Error rolling over data stream ${name}: ${error.message}`);
  }
};

export const getDataStreamSettingsOfEarliestIndex = async (esClient: EsClient, name: string) => {
  const matchingIndexesObj = await esClient.indices.getSettings({ index: name });

  const matchingIndexes = Object.keys(matchingIndexesObj ?? {});
  matchingIndexes.sort(
    (a, b) =>
      Number(matchingIndexesObj[a].settings?.index?.creation_date) -
      Number(matchingIndexesObj[b].settings?.index?.creation_date)
  );

  return matchingIndexesObj[matchingIndexes[0]].settings;
};

/**
 * Number of backing indices behind a failure store, closed ones included. Returns 0
 * instead of throwing while the failure store does not exist yet, so callers can poll
 * it: documents reach the failure store asynchronously, and closing or rolling one over
 * before its first backing index exists fails with a confusing error.
 */
export const countFailureStoreIndices = async (
  esClient: EsClient,
  failureStore: string
): Promise<number> => {
  try {
    const { indices } = await esClient.indices.stats({
      index: failureStore,
      forbid_closed_indices: false,
    });
    return Object.keys(indices ?? {}).length;
  } catch {
    return 0;
  }
};

export const closeDataStream = async (esClient: EsClient, name: string) => {
  const indices = Object.keys(
    (await esClient.indices.stats({ index: name, forbid_closed_indices: false })).indices ?? {}
  );

  if (indices.length === 0) {
    throw new Error(`Data stream ${name} has no indices to close`);
  }

  for (const index of indices) {
    await esClient.indices.close({ index });
  }
};

/**
 * Creates a component template. Unlike the synthtrace client helper this
 * replaces, it fails loudly and always overwrites: a template leaked by an
 * earlier run must not silently change the mappings a spec relies on.
 */
export const createComponentTemplate = async (
  esClient: EsClient,
  {
    name,
    mappings,
    dataStreamOptions,
  }: {
    name: string;
    mappings?: MappingTypeMapping;
    dataStreamOptions?: Record<string, unknown>;
  }
) =>
  esClient.cluster.putComponentTemplate({
    name,
    template: {
      ...(mappings ? { mappings } : {}),
      ...(dataStreamOptions ? { data_stream_options: dataStreamOptions } : {}),
    },
  });

export const createIndexTemplate = async (
  esClient: EsClient,
  {
    name,
    indexPatterns,
    composedOf = [],
    priority = 500,
    managed = false,
    defaultPipeline,
  }: {
    name: string;
    indexPatterns: string[];
    composedOf?: string[];
    priority?: number;
    managed?: boolean;
    defaultPipeline?: string;
  }
) =>
  esClient.indices.putIndexTemplate({
    name,
    _meta: {
      managed,
      description: 'Created by the dataset quality Scout suite.',
    },
    priority,
    index_patterns: indexPatterns,
    // Order matters: entries listed later win on conflicting field definitions,
    // so the built-in `logs@*` templates intentionally follow the custom one.
    composed_of: composedOf,
    allow_auto_create: true,
    data_stream: { hidden: false },
    ...(defaultPipeline ? { template: { settings: { default_pipeline: defaultPipeline } } } : {}),
  });

/**
 * Runs every teardown step in the order given, continuing past failures, then
 * reports them together.
 *
 * Order matters: Elasticsearch refuses to delete an index template while a data
 * stream created from it still exists, so data streams have to go first. Plain
 * `await`s would honour the order but skip every step after the first failure,
 * leaking whatever those would have removed.
 */
export const cleanUpAll = async (steps: Array<() => Promise<unknown>>): Promise<void> => {
  const failures: Error[] = [];

  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Teardown failed: ${failures.map(({ message }) => message).join('; ')}`);
  }
};

/**
 * Teardown helpers. Each swallows a missing-resource error only — anything else
 * still surfaces, so a broken cleanup can't quietly mask a broken test.
 */
const ignoreMissing = async (
  operation: () => Promise<unknown>,
  log: ScoutLogger,
  label: string
) => {
  try {
    await operation();
  } catch (error) {
    if (error?.meta?.statusCode === 404) {
      return;
    }
    log.error(`Failed to clean up ${label}: ${error.message}`);
    throw error;
  }
};

export const deleteIndexTemplateIfExists = async (
  esClient: EsClient,
  name: string,
  log: ScoutLogger
) =>
  ignoreMissing(
    () => esClient.indices.deleteIndexTemplate({ name }),
    log,
    `index template ${name}`
  );

export const deleteComponentTemplateIfExists = async (
  esClient: EsClient,
  name: string,
  log: ScoutLogger
) =>
  ignoreMissing(
    () => esClient.cluster.deleteComponentTemplate({ name }),
    log,
    `component template ${name}`
  );

export const deletePipelineIfExists = async (esClient: EsClient, id: string, log: ScoutLogger) =>
  ignoreMissing(() => esClient.ingest.deletePipeline({ id }), log, `ingest pipeline ${id}`);

export const deleteDataStreamIfExists = async (
  esClient: EsClient,
  name: string,
  log: ScoutLogger
) => ignoreMissing(() => esClient.indices.deleteDataStream({ name }), log, `data stream ${name}`);

export const disableFailureStoreIfExists = async (
  esClient: EsClient,
  name: string,
  log: ScoutLogger
) =>
  ignoreMissing(
    () => esClient.indices.putDataStreamOptions({ name, failure_store: { enabled: false } }),
    log,
    `failure store options for data stream ${name}`
  );

/**
 * Stamps the global `logs` index template as belonging to an integration, which
 * is how a data stream gets reported as "categorized" without installing a package.
 *
 * This mutates cluster-wide state — callers must restore it with
 * `cleanLogIndexTemplate` in a `finally`-equivalent hook.
 */
export const addIntegrationToLogIndexTemplate = async ({
  esClient,
  name,
  managedBy = 'fleet',
}: {
  esClient: EsClient;
  name: string;
  managedBy?: string;
}) => putLogIndexTemplateMeta({ esClient, packageMeta: { name }, managedBy });

export const cleanLogIndexTemplate = async ({ esClient }: { esClient: EsClient }) =>
  putLogIndexTemplateMeta({ esClient, packageMeta: undefined, managedBy: undefined });

const putLogIndexTemplateMeta = async ({
  esClient,
  packageMeta,
  managedBy,
}: {
  esClient: EsClient;
  packageMeta: { name: string } | undefined;
  managedBy: string | undefined;
}) => {
  const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate({
    name: 'logs',
  });

  if (indexTemplates.length === 0) {
    throw new Error('The global `logs` index template is missing');
  }

  // The GET response carries fields the PUT API rejects.
  const {
    created_date: createdDate,
    modification_date: modificationDate,
    created_date_millis: createdDateMillis,
    modified_date_millis: modifiedDateMillis,
    ...safeTemplate
  } = indexTemplates[0].index_template as IndicesIndexTemplate & {
    created_date: number;
    created_date_millis: number;
    modification_date: number;
    modified_date_millis: number;
  };

  await esClient.indices.putIndexTemplate({
    name: 'logs',
    ...safeTemplate,
    _meta: {
      ...safeTemplate._meta,
      package: packageMeta,
      managed_by: managedBy,
    },
    // GET may return a bare string where PUT requires string[].
    ignore_missing_component_templates: safeTemplate.ignore_missing_component_templates
      ? [safeTemplate.ignore_missing_component_templates].flat()
      : undefined,
  });
};
