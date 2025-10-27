/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterComponentTemplate,
  DocStats,
  EpochTime,
  IndicesDataStream,
  IndicesGetDataStreamSettingsDataStreamSettings,
  IndicesGetIndexTemplateIndexTemplateItem,
  IngestPipeline,
  UnitMillis,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type {
  FailureStore,
  FailureStoreStatsResponse,
  DataStreamWithFailureStore,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import type {
  ClassicIngestStreamEffectiveLifecycle,
  IngestStreamSettings,
} from '@kbn/streams-schema';
import { FAILURE_STORE_SELECTOR } from '../../../common/constants';
import { DefinitionNotFoundError } from './errors/definition_not_found_error';

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
}

export function getDataStreamLifecycle(
  dataStream: IndicesDataStream | null
): ClassicIngestStreamEffectiveLifecycle {
  if (!dataStream) {
    return { error: { message: 'Data stream not found' } };
  }

  if (dataStream.next_generation_managed_by === 'Index Lifecycle Management') {
    return { ilm: { policy: dataStream.ilm_policy! } };
  }

  if (dataStream.next_generation_managed_by === 'Data stream lifecycle') {
    const retention = dataStream.lifecycle?.data_retention;
    return { dsl: { data_retention: retention ? String(retention) : undefined } };
  }

  if (dataStream.next_generation_managed_by === 'Unmanaged') {
    return { disabled: {} };
  }

  return {
    error: {
      message: `Unknown data stream lifecycle state [${dataStream.next_generation_managed_by}]`,
    },
  };
}

export function getDataStreamSettings(dataStream?: IndicesGetDataStreamSettingsDataStreamSettings) {
  const settings: IngestStreamSettings = {};

  if (dataStream?.effective_settings.index?.number_of_replicas) {
    settings['index.number_of_replicas'] = {
      value: Number(dataStream.effective_settings.index.number_of_replicas),
    };
  }

  if (dataStream?.effective_settings.index?.number_of_shards) {
    settings['index.number_of_shards'] = {
      value: Number(dataStream.effective_settings.index.number_of_shards),
    };
  }

  if (dataStream?.effective_settings.index?.refresh_interval) {
    settings['index.refresh_interval'] = {
      value: dataStream.effective_settings.index.refresh_interval,
    };
  }

  return settings;
}

interface ReadUnmanagedAssetsParams extends BaseParams {
  dataStream: IndicesDataStream;
}

export interface UnmanagedElasticsearchAssets {
  ingestPipeline: string | undefined;
  componentTemplates: string[];
  indexTemplate: string;
  dataStream: string;
}

export async function getUnmanagedElasticsearchAssets({
  dataStream,
  scopedClusterClient,
}: ReadUnmanagedAssetsParams): Promise<UnmanagedElasticsearchAssets> {
  // retrieve linked index template, component template and ingest pipeline
  const templateName = dataStream.template;
  const componentTemplates: string[] = [];
  const template = await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
    name: templateName,
  });
  if (template.index_templates.length) {
    template.index_templates[0].index_template.composed_of?.forEach((componentTemplateName) => {
      componentTemplates.push(componentTemplateName);
    });
  }
  const writeIndexName = dataStream.indices.at(-1)?.index_name!;
  const currentIndex = await scopedClusterClient.asCurrentUser.indices.get({
    index: writeIndexName,
  });
  const ingestPipelineId = currentIndex[writeIndexName].settings?.index?.default_pipeline;

  return {
    ingestPipeline: ingestPipelineId,
    componentTemplates,
    indexTemplate: templateName,
    dataStream: dataStream.name,
  };
}
interface ReadUnmanagedAssetsDetailsParams extends BaseParams {
  assets: UnmanagedElasticsearchAssets;
}

export type UnmanagedComponentTemplateDetails = (
  | ClusterComponentTemplate
  | { name: string; component_template: undefined }
) & {
  used_by: string[];
};

export interface UnmanagedElasticsearchAssetDetails {
  ingestPipeline?: IngestPipeline & { name: string };
  componentTemplates: UnmanagedComponentTemplateDetails[];
  indexTemplate: IndicesGetIndexTemplateIndexTemplateItem;
  dataStream: IndicesDataStream;
}

async function fetchComponentTemplate(
  scopedClusterClient: IScopedClusterClient,
  name: string
): Promise<ClusterComponentTemplate | { name: string; component_template: undefined }> {
  try {
    const response = await scopedClusterClient.asCurrentUser.cluster.getComponentTemplate({ name });
    return (
      response.component_templates.find((template) => template.name === name) ?? {
        name,
        component_template: undefined,
      }
    );
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return { name, component_template: undefined };
    }
    throw e;
  }
}

async function fetchComponentTemplates(
  scopedClusterClient: IScopedClusterClient,
  names: string[],
  allIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]
): Promise<UnmanagedComponentTemplateDetails[]> {
  const templates = await Promise.all(
    names.map((name) => fetchComponentTemplate(scopedClusterClient, name))
  );

  return templates
    .filter(
      (
        template
      ): template is ClusterComponentTemplate | { name: string; component_template: undefined } =>
        template !== undefined
    )
    .map((componentTemplate) => ({
      ...componentTemplate,
      used_by: allIndexTemplates
        .filter((template) => template.index_template.composed_of?.includes(componentTemplate.name))
        .map((template) => template.name),
    }));
}

async function fetchIngestPipeline(
  scopedClusterClient: IScopedClusterClient,
  pipelineId: string | undefined
): Promise<(IngestPipeline & { name: string }) | undefined> {
  if (!pipelineId) return undefined;
  const response = await scopedClusterClient.asCurrentUser.ingest.getPipeline({ id: pipelineId });
  return { ...response[pipelineId], name: pipelineId };
}

export async function getUnmanagedElasticsearchAssetDetails({
  scopedClusterClient,
  assets,
}: ReadUnmanagedAssetsDetailsParams): Promise<UnmanagedElasticsearchAssetDetails> {
  const allIndexTemplates = (await scopedClusterClient.asCurrentUser.indices.getIndexTemplate())
    .index_templates;

  const [ingestPipeline, componentTemplates, dataStreamResponse] = await Promise.all([
    fetchIngestPipeline(scopedClusterClient, assets.ingestPipeline),
    fetchComponentTemplates(scopedClusterClient, assets.componentTemplates, allIndexTemplates),
    scopedClusterClient.asCurrentUser.indices.getDataStream({ name: assets.dataStream }),
  ]);

  const indexTemplate = allIndexTemplates.find(
    (template) => template.name === assets.indexTemplate
  );
  if (!indexTemplate) {
    throw new Error(`Index template ${assets.indexTemplate} not found`);
  }

  return {
    ingestPipeline,
    componentTemplates,
    indexTemplate,
    dataStream: dataStreamResponse.data_streams[0],
  };
}

interface CheckAccessParams extends BaseParams {
  name: string;
}

export async function checkAccess({
  name,
  scopedClusterClient,
}: CheckAccessParams): Promise<{ read: boolean; write: boolean }> {
  return checkAccessBulk({
    names: [name],
    scopedClusterClient,
  }).then((privileges) => privileges[name]);
}

interface CheckAccessBulkParams extends BaseParams {
  names: string[];
}

export async function checkAccessBulk({
  names,
  scopedClusterClient,
}: CheckAccessBulkParams): Promise<Record<string, { read: boolean; write: boolean }>> {
  if (!names.length) {
    return {};
  }
  const hasPrivilegesResponse = await scopedClusterClient.asCurrentUser.security.hasPrivileges({
    index: [{ names, privileges: ['read', 'write'] }],
  });

  return Object.fromEntries(
    names.map((name) => {
      const hasReadAccess = hasPrivilegesResponse.index[name].read === true;
      const hasWriteAccess = hasPrivilegesResponse.index[name].write === true;
      return [name, { read: hasReadAccess, write: hasWriteAccess }];
    })
  );
}

export async function getDataStream({
  name,
  scopedClusterClient,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<IndicesDataStream> {
  let dataStream: IndicesDataStream | undefined;
  try {
    const response = await scopedClusterClient.asCurrentUser.indices.getDataStream({ name });
    dataStream = response.data_streams[0];
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      // fall through and throw not found
    } else {
      throw e;
    }
  }

  if (!dataStream) {
    throw new DefinitionNotFoundError(`Stream definition for ${name} not found.`);
  }
  return dataStream;
}

export async function getDefaultRetentionValue({
  scopedClusterClient,
}: {
  scopedClusterClient: IScopedClusterClient;
}): Promise<string | undefined> {
  let defaultRetention: string | undefined;
  try {
    const { persistent, defaults } = await scopedClusterClient.asCurrentUser.cluster.getSettings({
      include_defaults: true,
    });
    const persistentDSRetention = persistent?.data_streams?.lifecycle?.retention?.failures_default;
    const defaultsDSRetention = defaults?.data_streams?.lifecycle?.retention?.failures_default;
    defaultRetention = persistentDSRetention ?? defaultsDSRetention;
  } catch (e) {
    if (e.meta?.statusCode === 403) {
      // if user doesn't have permissions to read cluster settings, we just return undefined
    } else {
      throw e;
    }
  }
  return defaultRetention;
}

export async function getFailureStore({
  name,
  scopedClusterClient,
  isServerless,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
  isServerless: boolean;
}): Promise<FailureStore> {
  // TODO: remove DataStreamWithFailureStore here and in streams-schema once failure store is added to the IndicesDataStream type
  const dataStream = (await getDataStream({
    name,
    scopedClusterClient,
  })) as DataStreamWithFailureStore;

  const defaultRetentionPeriod =
    dataStream.failure_store?.lifecycle?.retention_determined_by === 'default_failures_retention'
      ? dataStream.failure_store?.lifecycle?.effective_retention
      : isServerless
      ? undefined
      : await getDefaultRetentionValue({ scopedClusterClient });

  return {
    enabled: !!dataStream.failure_store?.enabled,
    retentionPeriod: {
      custom: dataStream.failure_store?.lifecycle?.data_retention,
      default: defaultRetentionPeriod,
    },
  };
}

export async function getFailureStoreStats({
  name,
  scopedClusterClient,
  isServerless,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
  isServerless: boolean;
}): Promise<FailureStoreStatsResponse> {
  const failureStoreDocs = isServerless
    ? await getFailureStoreMeteringSize({ name, scopedClusterClient })
    : await getFailureStoreSize({ name, scopedClusterClient });
  const creationDate = await getFailureStoreCreationDate({ name, scopedClusterClient });

  return {
    size: failureStoreDocs?.total_size_in_bytes,
    count: failureStoreDocs?.count,
    creationDate,
  };
}

export async function getFailureStoreSize({
  name,
  scopedClusterClient,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<DocStats | undefined> {
  try {
    const response = await scopedClusterClient.asCurrentUser.indices.stats({
      index: `${name}${FAILURE_STORE_SELECTOR}`,
      metric: ['docs'],
      forbid_closed_indices: false,
    });
    const docsStats = response?._all?.total?.docs;
    return {
      count: docsStats?.count || 0,
      total_size_in_bytes: docsStats?.total_size_in_bytes || 0,
    };
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return undefined;
    } else {
      throw e;
    }
  }
}

export async function getFailureStoreMeteringSize({
  name,
  scopedClusterClient,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<DocStats | undefined> {
  try {
    const response = await scopedClusterClient.asSecondaryAuthUser.transport.request<{
      _total: { num_docs: number; size_in_bytes: number };
    }>({
      method: 'GET',
      path: `/_metering/stats/${name}${FAILURE_STORE_SELECTOR}`,
    });

    return {
      count: response._total?.num_docs || 0,
      total_size_in_bytes: response._total?.size_in_bytes || 0,
    };
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return undefined;
    } else {
      throw e;
    }
  }
}

export async function getFailureStoreCreationDate({
  name,
  scopedClusterClient,
}: {
  name: string;
  scopedClusterClient: IScopedClusterClient;
}): Promise<number | undefined> {
  let age: number | undefined;
  try {
    const response = await scopedClusterClient.asCurrentUser.indices.explainDataLifecycle({
      index: `${name}${FAILURE_STORE_SELECTOR}`,
    });
    const indices = response.indices;
    if (indices && typeof indices === 'object') {
      const firstIndex = Object.values(indices)[0] as {
        index_creation_date_millis?: EpochTime<UnitMillis>;
      };
      age = firstIndex?.index_creation_date_millis;
    }
    return age || undefined;
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return undefined;
    } else {
      throw e;
    }
  }
}

export async function updateFailureStore({
  name,
  enabled,
  customRetentionPeriod,
  scopedClusterClient,
  isServerless,
}: {
  name: string;
  enabled: boolean;
  customRetentionPeriod?: string;
  scopedClusterClient: IScopedClusterClient;
  isServerless: boolean;
}): Promise<void> {
  try {
    await scopedClusterClient.asCurrentUser.indices.putDataStreamOptions(
      {
        name,
        failure_store: {
          enabled,
          lifecycle: {
            data_retention: customRetentionPeriod,
            ...(isServerless ? {} : { enabled }),
          },
        },
      },
      { meta: true }
    );
  } catch (error) {
    throw new Error(`Failed to update failure store for stream "${name}": ${error}`);
  }
}
