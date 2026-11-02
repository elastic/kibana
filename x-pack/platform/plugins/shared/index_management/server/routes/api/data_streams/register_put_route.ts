/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import { isRecord } from '../../../../common/lib';
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

/** HTTP Warning headers have the following syntax:
 * <warn-code> <warn-agent> <warn-text> (where warn-code is a three-digit number)
 * This function only returns the warn-text if it exists.
 * */
export const getEsWarningText = (warning: string): string | null => {
  const match = warning.match(/\d{3} Elasticsearch-\w+ "(.*)"/);
  return match ? match[1] : null;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Resolves the failure store options the index template would apply to a data stream, by
 * simulating the template. Used to make "inherit" behave the same way the Streams plugin does:
 * Elasticsearch does not re-apply a template's `data_stream_options` to an existing data stream
 * when the data stream-level options are removed, so to inherit we must re-apply the template's
 * resolved failure store explicitly. Falls back to `{ enabled: false }` when the template defines
 * none (an empty object would be rejected by Elasticsearch).
 */
const resolveTemplateFailureStore = (
  simulateResponse: unknown
): { enabled: boolean } | Record<string, unknown> => {
  const fallback = { enabled: false };
  if (!isPlainRecord(simulateResponse)) return fallback;

  const template = simulateResponse.template;
  if (!isPlainRecord(template)) return fallback;

  const dataStreamOptions = template.data_stream_options;
  if (!isPlainRecord(dataStreamOptions)) return fallback;

  const failureStore = dataStreamOptions.failure_store;
  return isPlainRecord(failureStore) ? failureStore : fallback;
};

export function registerPutDataRetention({ router, lib: { handleEsError } }: RouteDependencies) {
  const bodySchema = schema.object({
    dataStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
    dataRetention: schema.maybe(schema.string({ maxLength: 1000 })),
    enabled: schema.maybe(schema.boolean()),
  });

  router.put(
    {
      path: addBasePath('/data_streams/data_retention'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { dataStreams, dataRetention, enabled } = request.body as TypeOf<typeof bodySchema>;

      const { client } = (await context.core).elasticsearch;

      try {
        // Only when enabled is explicitly set to false, we delete the data retention policy.
        if (enabled === false) {
          await client.asCurrentUser.indices.deleteDataLifecycle({ name: dataStreams });
        } else {
          // Otherwise, we create or update the data retention policy.
          //
          // Be aware that in serverless it could happen that the user defined
          // data retention wont be the effective retention as there might be a
          // global data retention limit set.
          const { headers } = await client.asCurrentUser.indices.putDataLifecycle(
            {
              name: dataStreams,
              data_retention: dataRetention,
            },
            { meta: true }
          );

          return response.ok({
            body: {
              success: true,
              ...(headers?.warning
                ? { warning: getEsWarningText(headers.warning) ?? headers.warning }
                : {}),
            },
          });
        }

        return response.ok({ body: { success: true } });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

export function registerPutDataLifecycle({ router, lib: { handleEsError } }: RouteDependencies) {
  const bodySchema = schema.object({
    dataStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
    enabled: schema.maybe(schema.boolean()),
    dataRetention: schema.maybe(schema.string({ maxLength: 1000 })),
    frozenAfter: schema.maybe(schema.string({ maxLength: 1000 })),
  });

  router.put(
    {
      path: addBasePath('/data_streams/data_lifecycle'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { dataStreams, enabled, dataRetention, frozenAfter } = request.body as TypeOf<
        typeof bodySchema
      >;

      const { client } = (await context.core).elasticsearch;

      try {
        if (enabled === false) {
          await client.asCurrentUser.indices.deleteDataLifecycle({ name: dataStreams });
          return response.ok({ body: { success: true } });
        }

        const basePayload = {
          ...(enabled != null ? { enabled } : {}),
          ...(dataRetention != null ? { data_retention: dataRetention } : {}),
          ...(frozenAfter != null ? { frozen_after: frozenAfter } : {}),
        };

        const normalizeDownsampling = (
          value: unknown
        ): Array<{ after: string; fixed_interval: string }> | undefined => {
          if (!Array.isArray(value) || value.length === 0) return undefined;
          const normalized: Array<{ after: string; fixed_interval: string }> = [];
          for (const item of value) {
            if (!isRecord(item)) return undefined;
            const after = item.after;
            const fixedInterval = item.fixed_interval;
            if (typeof after !== 'string') return undefined;
            if (typeof fixedInterval !== 'string' && typeof fixedInterval !== 'number')
              return undefined;
            normalized.push({
              after,
              fixed_interval:
                typeof fixedInterval === 'string' ? fixedInterval : String(fixedInterval),
            });
          }
          return normalized;
        };

        // Preserve downsampling when updating DSL lifecycle settings.
        // The Index Management UI does not expose downsampling yet, but PUTting data lifecycle
        // without it may clear the existing config depending on Elasticsearch behavior.
        const downsamplingByName = new Map<
          string,
          Array<{ after: string; fixed_interval: string }>
        >();
        try {
          const current = await client.asCurrentUser.indices.getDataStream({
            name: dataStreams,
            expand_wildcards: 'all',
          });
          for (const dataStream of current.data_streams ?? []) {
            const normalized = normalizeDownsampling(dataStream.lifecycle?.downsampling);
            if (normalized) {
              downsamplingByName.set(dataStream.name, normalized);
            }
          }
        } catch {
          // Best-effort preservation. If we cannot read the current state, proceed without it.
        }

        const groups = new Map<
          string,
          { names: string[]; downsampling?: Array<{ after: string; fixed_interval: string }> }
        >();
        for (const streamName of dataStreams) {
          const downsampling = downsamplingByName.get(streamName);
          const key = downsampling ? JSON.stringify(downsampling) : 'none';
          const existing = groups.get(key);
          if (existing) {
            existing.names.push(streamName);
          } else {
            groups.set(key, { names: [streamName], ...(downsampling ? { downsampling } : {}) });
          }
        }

        const warnings: string[] = [];
        for (const group of groups.values()) {
          const payload = {
            name: group.names,
            ...basePayload,
            ...(group.downsampling ? { downsampling: group.downsampling } : {}),
          };

          const { headers } = await client.asCurrentUser.indices.putDataLifecycle(payload, {
            meta: true,
          });
          if (headers?.warning) {
            warnings.push(getEsWarningText(headers.warning) ?? headers.warning);
          }
        }

        return response.ok({
          body: {
            success: true,
            ...(warnings.length > 0 ? { warning: warnings.join('; ') } : {}),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

export function registerPutDataStreamSettings({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  const bodySchema = schema.object({
    dataStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
    settings: schema.recordOf(schema.string({ maxLength: 1000 }), schema.any()),
  });

  router.put(
    {
      path: addBasePath('/data_streams/settings'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { dataStreams, settings } = request.body as TypeOf<typeof bodySchema>;
      const { client } = (await context.core).elasticsearch;

      const lifecycleName: unknown = settings['index.lifecycle.name'];
      const preferIlm: unknown = settings['index.lifecycle.prefer_ilm'];

      const normalizedSettings: {
        'index.lifecycle.name'?: string | null;
        'index.lifecycle.prefer_ilm'?: boolean | null;
      } = {
        ...(typeof lifecycleName === 'string' || lifecycleName === null
          ? { 'index.lifecycle.name': lifecycleName }
          : {}),
        ...(typeof preferIlm === 'boolean' || preferIlm === null
          ? { 'index.lifecycle.prefer_ilm': preferIlm }
          : {}),
      };

      try {
        const responseBody = await client.asCurrentUser.indices.putDataStreamSettings({
          name: dataStreams,
          settings: normalizedSettings,
        });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

export function registerPutDataStreamFailureStore({
  router,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const bodySchema = schema.object(
    {
      dataStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
      dsFailureStore: schema.boolean(),
      customRetentionPeriod: schema.maybe(
        schema.oneOf([schema.string({ maxLength: 1000 }), schema.literal(-1)])
      ),
      retentionDisabled: schema.maybe(schema.boolean()),
      inheritFailureStore: schema.maybe(schema.boolean()),
    },
    {
      validate: (value) => {
        // Enforce mutual exclusivity between custom retention and disabled retention
        if (value.customRetentionPeriod && value.retentionDisabled) {
          return 'Cannot specify both customRetentionPeriod and retentionDisabled';
        }
      },
    }
  );

  router.put(
    {
      path: addBasePath('/data_streams/configure_failure_store'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const {
        dataStreams,
        dsFailureStore,
        customRetentionPeriod,
        retentionDisabled,
        inheritFailureStore,
      } = request.body as TypeOf<typeof bodySchema>;

      const { client } = (await context.core).elasticsearch;

      // Build lifecycle configuration for failure store
      const buildFailureStoreLifecycle = () => {
        // Case 1: Enable lifecycle with custom retention period
        // Schema validation ensures customRetentionPeriod and retentionDisabled are mutually exclusive
        if (customRetentionPeriod !== undefined) {
          return {
            lifecycle: {
              enabled: true,
              data_retention: customRetentionPeriod,
            },
          };
        }

        // Case 2: Explicitly disable lifecycle retention (feature-flagged)
        if (retentionDisabled && config.enableFailureStoreRetentionDisabling) {
          return {
            lifecycle: {
              enabled: false,
            },
          };
        }

        // Case 3: No lifecycle configuration (use cluster defaults)
        return {};
      };

      try {
        // Configure failure store for each data stream
        const promises = dataStreams.map(async (dataStreamName) => {
          // "Inherit" should leave the data stream with the same effective failure store the
          // index template provides, without leaving an explicit data stream-level override that
          // the UI would then read as a user choice.
          if (inheritFailureStore) {
            const simulateResponse = await client.asCurrentUser.indices.simulateIndexTemplate({
              name: dataStreamName,
            });
            const failureStorePayload = resolveTemplateFailureStore(simulateResponse);

            // When the template leaves the failure store disabled (or defines none), delete the
            // data stream-level options instead of writing `{ enabled: false }`. This keeps the
            // effective state disabled regardless of whether Elasticsearch re-applies the template
            // on delete, while removing the explicit override so the data stream is (and reads as)
            // truly inherited. When the template enables the failure store we must re-apply its
            // resolved options explicitly, because Elasticsearch does not re-apply a template's
            // `data_stream_options` to an existing data stream when the options are removed.
            if (failureStorePayload.enabled === false) {
              const { headers } = await client.asCurrentUser.indices.deleteDataStreamOptions(
                { name: dataStreamName },
                { meta: true }
              );
              return headers;
            }

            const { headers } = await client.asCurrentUser.indices.putDataStreamOptions(
              { name: dataStreamName, failure_store: failureStorePayload },
              { meta: true }
            );
            return headers;
          }

          const failureStorePayload = {
            enabled: dsFailureStore,
            ...(dsFailureStore && buildFailureStoreLifecycle()),
          };

          const { headers } = await client.asCurrentUser.indices.putDataStreamOptions(
            { name: dataStreamName, failure_store: failureStorePayload },
            { meta: true }
          );
          return headers;
        });

        const results = await Promise.all(promises);
        const warnings = results
          .map((headers) =>
            headers?.warning ? getEsWarningText(headers.warning) ?? headers.warning : null
          )
          .filter(Boolean);

        return response.ok({
          body: {
            success: true,
            ...(warnings.length > 0 ? { warning: warnings.join('; ') } : {}),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
