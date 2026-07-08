/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  IndicesDataStream,
  IndicesDataStreamsStatsDataStreamsStatsItem,
  SecurityHasPrivilegesResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { MeteringStats } from '../../../lib/types';
import {
  deserializeDataStream,
  deserializeDataStreamList,
} from '../../../lib/data_stream_serialization';
import type { EnhancedDataStreamFromEs, EsDataRetention } from '../../../../common/types';
import { isRecord } from '../../../../common/lib';
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

interface MeteringStatsResponse {
  datastreams: MeteringStats[];
}

export interface ExplicitDataStreamOptions {
  failureStore?: {
    enabled?: boolean;
    lifecycle?: { enabled?: boolean; data_retention?: EsDataRetention };
  };
  lifecycleSettings?: {
    explicitIlmPolicyName?: string;
    preferIlm?: boolean;
  };
}

const parseBooleanFromEsSetting = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const getTemplateFailureStoreEnabled = async (
  client: IScopedClusterClient,
  templateName: string | undefined
): Promise<boolean | undefined> => {
  if (!templateName) return undefined;

  const templateResponse = await client.asCurrentUser.transport
    .request<unknown>({
      method: 'GET',
      path: `/_index_template/${encodeURIComponent(templateName)}`,
    })
    .catch(() => undefined);

  if (!isRecord(templateResponse)) return undefined;

  const indexTemplates: unknown = templateResponse.index_templates;
  if (!Array.isArray(indexTemplates) || indexTemplates.length === 0) return undefined;

  const first: unknown = indexTemplates[0];
  if (!isRecord(first)) return undefined;

  const indexTemplate: unknown = first.index_template;
  if (!isRecord(indexTemplate)) return undefined;

  const template: unknown = indexTemplate.template;
  if (!isRecord(template)) return undefined;

  const dataStreamOptions: unknown = template.data_stream_options;
  if (!isRecord(dataStreamOptions)) return undefined;

  const failureStore: unknown = dataStreamOptions.failure_store;
  if (!isRecord(failureStore)) return undefined;

  const enabled: unknown = failureStore.enabled;
  return typeof enabled === 'boolean' ? enabled : undefined;
};

/**
 * Returns the data stream's *explicit* options (from `GET .../_options`), if any.
 * Unlike the regular data stream GET, this endpoint omits anything inherited from the
 * index template, so the presence of `failure_store` here means an explicit override.
 */
const getExplicitDataStreamOptions = async (
  client: IScopedClusterClient,
  name: string
): Promise<ExplicitDataStreamOptions> => {
  // The `_options` endpoint may be unavailable (older ES) or fail on privileges. Degrade to "no
  // explicit override" rather than failing the whole detail panel request.
  const response = await client.asCurrentUser.indices
    .getDataStreamOptions({ name })
    .catch(() => undefined);
  const entry = response?.data_streams?.[0];
  const options: unknown = isRecord(entry) ? entry.options : undefined;
  const failureStore: unknown = isRecord(options) ? options.failure_store : undefined;

  if (!isRecord(failureStore)) {
    return {};
  }

  const enabled = failureStore.enabled;
  const lifecycle = failureStore.lifecycle;
  const lifecycleResult: { enabled?: boolean; data_retention?: EsDataRetention } = {};

  if (isRecord(lifecycle)) {
    if (typeof lifecycle.enabled === 'boolean') {
      lifecycleResult.enabled = lifecycle.enabled;
    }
    const dataRetention = lifecycle.data_retention;
    if ((typeof dataRetention === 'string' && dataRetention.length > 0) || dataRetention === -1) {
      lifecycleResult.data_retention = dataRetention;
    }
  }

  return {
    failureStore: {
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
      ...(Object.keys(lifecycleResult).length > 0 ? { lifecycle: lifecycleResult } : {}),
    },
  };
};

/**
 * Returns the data stream's *explicit* lifecycle settings (from `GET .../_settings`),
 * if any. This mirrors the Streams ingestion API behavior, where lifecycle inheritance
 * depends on whether there is a data stream-level override.
 */
const getExplicitDataStreamLifecycleSettings = async (
  client: IScopedClusterClient,
  name: string
): Promise<ExplicitDataStreamOptions['lifecycleSettings']> => {
  // The `_settings` endpoint may be unavailable (older ES) or fail on privileges. Degrade to
  // "no explicit lifecycle settings" rather than failing the whole detail panel request.
  const response = await client.asCurrentUser.indices
    .getDataStreamSettings({ name })
    .catch(() => undefined);
  const entry = response?.data_streams?.[0];
  const settings: unknown = isRecord(entry) ? entry.settings : undefined;

  if (!isRecord(settings)) {
    return undefined;
  }

  const index = settings.index;
  if (!isRecord(index)) {
    return undefined;
  }

  const lifecycle = index.lifecycle;
  if (!isRecord(lifecycle)) {
    return undefined;
  }

  const ilmPolicyName = lifecycle.name;
  const preferIlm = lifecycle.prefer_ilm;
  const preferIlmBool = parseBooleanFromEsSetting(preferIlm);

  const result: NonNullable<ExplicitDataStreamOptions['lifecycleSettings']> = {
    ...(typeof ilmPolicyName === 'string' && ilmPolicyName.length > 0
      ? { explicitIlmPolicyName: ilmPolicyName }
      : {}),
    ...(preferIlmBool !== undefined ? { preferIlm: preferIlmBool } : {}),
  };

  return Object.keys(result).length > 0 ? result : undefined;
};

const extractGlobalMaxRetention = (lifecycleResponse: unknown): string | undefined => {
  if (!isRecord(lifecycleResponse)) return undefined;
  const globalRetention: unknown = lifecycleResponse.global_retention;
  if (!isRecord(globalRetention)) return undefined;
  const maxRetention: unknown = globalRetention.max_retention;
  return typeof maxRetention === 'string' ? maxRetention : undefined;
};
const enhanceDataStreams = ({
  dataStreams,
  dataStreamsStats,
  meteringStats,
  dataStreamsPrivileges,
  globalMaxRetention,
}: {
  dataStreams: IndicesDataStream[];
  dataStreamsStats?: IndicesDataStreamsStatsDataStreamsStatsItem[];
  meteringStats?: MeteringStats[];
  dataStreamsPrivileges?: SecurityHasPrivilegesResponse;
  globalMaxRetention?: string;
}): EnhancedDataStreamFromEs[] => {
  return dataStreams.map((dataStream) => {
    const enhancedDataStream: EnhancedDataStreamFromEs = {
      ...dataStream,
      ...(globalMaxRetention ? { global_max_retention: globalMaxRetention } : {}),
      privileges: {
        delete_index: dataStreamsPrivileges
          ? dataStreamsPrivileges.index[dataStream.name].delete_index
          : true,
        manage_data_stream_lifecycle: dataStreamsPrivileges
          ? dataStreamsPrivileges.index[dataStream.name].manage_data_stream_lifecycle
          : true,
        read_failure_store: dataStreamsPrivileges
          ? dataStreamsPrivileges.index[dataStream.name].read_failure_store
          : true,
        manage: dataStreamsPrivileges ? dataStreamsPrivileges.index[dataStream.name].manage : true,
      },
    };

    if (dataStreamsStats) {
      const currentDataStreamStats: IndicesDataStreamsStatsDataStreamsStatsItem | undefined =
        dataStreamsStats.find(({ data_stream: statsName }) => statsName === dataStream.name);

      if (currentDataStreamStats) {
        enhancedDataStream.store_size = currentDataStreamStats.store_size;
        enhancedDataStream.store_size_bytes = currentDataStreamStats.store_size_bytes;
        enhancedDataStream.maximum_timestamp = currentDataStreamStats.maximum_timestamp;
      }
    }

    if (meteringStats) {
      const datastreamMeteringStats = meteringStats.find((s) => s.name === dataStream.name);
      if (datastreamMeteringStats) {
        enhancedDataStream.metering_size_in_bytes = datastreamMeteringStats.size_in_bytes;
        enhancedDataStream.metering_doc_count = datastreamMeteringStats.num_docs;
      }
    }

    return enhancedDataStream;
  });
};

const getDataStreams = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.getDataStream({
    name,
    expand_wildcards: 'all',
  });
};

const getDataStreamLifecycle = (client: IScopedClusterClient, name: string) => {
  return client.asCurrentUser.indices.getDataLifecycle({
    name,
  });
};

const getDataStreamsStats = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.dataStreamsStats({
    name,
    expand_wildcards: 'all',
    human: true,
  });
};

const getMeteringStats = (client: IScopedClusterClient, name?: string) => {
  let path = `/_metering/stats`;
  if (name) {
    path = `${path}/${name}`;
  }
  return client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
    method: 'GET',
    path,
  });
};

const getDataStreamsPrivileges = (client: IScopedClusterClient, names: string[]) => {
  return client.asCurrentUser.security.hasPrivileges({
    index: [
      {
        names,
        privileges: [
          'delete_index',
          'manage_data_stream_lifecycle',
          'read_failure_store',
          'manage',
        ],
      },
    ],
  });
};

export function registerGetAllRoute({ router, lib: { handleEsError }, config }: RouteDependencies) {
  const querySchema = schema.object({
    includeStats: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
  });
  router.get(
    {
      path: addBasePath('/data_streams'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { query: querySchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const includeStats = (request.query as TypeOf<typeof querySchema>).includeStats === 'true';

      try {
        const { data_streams: dataStreams } = await getDataStreams(client);

        let dataStreamsStats;
        let dataStreamsPrivileges;
        let meteringStats;

        if (includeStats && config.isDataStreamStatsEnabled !== false) {
          ({ data_streams: dataStreamsStats } = await getDataStreamsStats(client));
        }
        if (includeStats && config.isSizeAndDocCountEnabled !== false) {
          ({ datastreams: meteringStats } = await getMeteringStats(client));
        }

        if (config.isSecurityEnabled() && dataStreams.length > 0) {
          dataStreamsPrivileges = await getDataStreamsPrivileges(
            client,
            dataStreams.map((dataStream) => dataStream.name)
          );
        }

        const { persistent, defaults } = await client.asInternalUser.cluster.getSettings({
          include_defaults: true,
        });
        const isLogsdbEnabled =
          (persistent?.cluster?.logsdb?.enabled ?? defaults?.cluster?.logsdb?.enabled) === 'true';

        // Get failure store cluster settings
        const failureStoreSettings = {
          enabled:
            persistent?.data_streams?.failure_store?.enabled ??
            defaults?.data_streams?.failure_store?.enabled,
          defaultRetentionPeriod:
            persistent?.data_streams?.lifecycle?.retention?.failures_default ??
            defaults?.data_streams?.lifecycle?.retention?.failures_default,
        };

        // Only take the lifecycle of the first data stream since all data streams have the same global retention period
        const lifecycle = await getDataStreamLifecycle(client, dataStreams[0].name);
        const globalMaxRetention = extractGlobalMaxRetention(lifecycle);

        const enhancedDataStreams = enhanceDataStreams({
          dataStreams,
          dataStreamsStats,
          meteringStats,
          dataStreamsPrivileges,
          globalMaxRetention,
        });

        return response.ok({
          body: deserializeDataStreamList(
            enhancedDataStreams,
            isLogsdbEnabled,
            failureStoreSettings
          ),
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

export function registerGetOneRoute({ router, lib: { handleEsError }, config }: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });
  router.get(
    {
      path: addBasePath('/data_streams/{name}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { params: paramsSchema },
    },
    async (context, request, response) => {
      const { name } = request.params as TypeOf<typeof paramsSchema>;
      const { client } = (await context.core).elasticsearch;
      let dataStreamsStats;
      let meteringStats;

      try {
        const { data_streams: dataStreams } = await getDataStreams(client, name);

        const lifecycle = await getDataStreamLifecycle(client, name);
        const globalMaxRetention = extractGlobalMaxRetention(lifecycle);

        if (config.isDataStreamStatsEnabled !== false) {
          ({ data_streams: dataStreamsStats } = await getDataStreamsStats(client, name));
        }

        if (config.isSizeAndDocCountEnabled !== false) {
          ({ datastreams: meteringStats } = await getMeteringStats(client, name));
        }

        if (dataStreams[0]) {
          let dataStreamsPrivileges;

          if (config.isSecurityEnabled()) {
            dataStreamsPrivileges = await getDataStreamsPrivileges(client, [dataStreams[0].name]);
          }

          const { persistent, defaults } = await client.asInternalUser.cluster.getSettings({
            include_defaults: true,
          });

          // Get failure store cluster settings
          const failureStoreSettings = {
            enabled:
              persistent?.data_streams?.failure_store?.enabled ??
              defaults?.data_streams?.failure_store?.enabled,
            defaultRetentionPeriod:
              persistent?.data_streams?.lifecycle?.retention?.failures_default ??
              defaults?.data_streams?.lifecycle?.retention?.failures_default,
          };

          const enhancedDataStreams = enhanceDataStreams({
            dataStreams,
            dataStreamsStats,
            meteringStats,
            dataStreamsPrivileges,
            globalMaxRetention,
          });
          const isLogsdbEnabled =
            (persistent?.cluster?.logsdb?.enabled ?? defaults?.cluster?.logsdb?.enabled) === 'true';

          // The data stream GET returns the *effective* failure store (template + override
          // merged), so it cannot tell us whether the data stream has its own override. The
          // `_options` endpoint returns only the explicit data stream level options, which is
          // what lets the UI distinguish "inherited from template" from "explicit override".
          const [explicitOptions, explicitLifecycleSettings, templateFailureStoreEnabled] =
            await Promise.all([
              getExplicitDataStreamOptions(client, name),
              getExplicitDataStreamLifecycleSettings(client, name),
              getTemplateFailureStoreEnabled(client, enhancedDataStreams[0].template),
            ]);

          const baseBody = deserializeDataStream(
            enhancedDataStreams[0],
            isLogsdbEnabled,
            failureStoreSettings,
            {
              ...explicitOptions,
              ...(explicitLifecycleSettings
                ? { lifecycleSettings: explicitLifecycleSettings }
                : {}),
            }
          );

          // Determine the effective failure store enabled state:
          // 1) explicit data stream override (via `_options`)
          // 2) the effective value reported by the data stream GET (template + overrides
          //    already merged by Elasticsearch — this is the source of truth for the
          //    *current* state, e.g. when the stream is explicitly disabled)
          // 3) index template defaults (what would be inherited if the GET omits it)
          // 4) cluster setting pattern match
          const explicitFailureStoreEnabled = explicitOptions.failureStore?.enabled;
          const effectiveFailureStoreEnabled = enhancedDataStreams[0].failure_store?.enabled;
          const resolvedFailureStoreEnabled =
            typeof explicitFailureStoreEnabled === 'boolean'
              ? explicitFailureStoreEnabled
              : typeof effectiveFailureStoreEnabled === 'boolean'
              ? effectiveFailureStoreEnabled
              : typeof templateFailureStoreEnabled === 'boolean'
              ? templateFailureStoreEnabled
              : baseBody.matchesFailureStoreClusterPattern === true;

          const body =
            baseBody.failureStoreEnabled === resolvedFailureStoreEnabled
              ? baseBody
              : { ...baseBody, failureStoreEnabled: resolvedFailureStoreEnabled };

          return response.ok({ body });
        }

        return response.notFound();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
