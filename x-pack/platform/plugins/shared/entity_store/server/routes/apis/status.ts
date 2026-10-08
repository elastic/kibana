/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { z, lazySchema } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import type { EntityStoreStatus, GetStatusSuccessResult } from '../../domain/types';
import type { EngineError, EngineStatus, LogExtractionConfig } from '../../domain/saved_objects';
import { capAtMaxLogsPerWindow } from '../../domain/logs_extraction/effective_page_limits';
import { ENTITY_STORE_STATUS } from '../../domain/constants';

/**
 * Legacy engine descriptor from V1. will be removed in a future version.
 */
interface LegacyEngineDescriptorV1 {
  filter: '';
  delay: string;
  timeout: string;
  frequency: string;
  lookbackPeriod: string;
  fieldHistoryLength: number;
  maxLogsPerPage: number;
  maxTimeWindowSize: string;
  maxLogsPerWindow: number;
  maxLogsPerWindowCapBehavior: 'defer' | 'drop';
  docsPerSecond: -1;
  indexPattern: '';
  enrichPolicyExecutionInterval: null;
  timestampField: '@timestamp';
  maxPageSearchSize: 10000;
  lastExecutionTimestamp: string | undefined;
}

type LogExtractionStatusFields = Pick<
  LegacyEngineDescriptorV1,
  | 'delay'
  | 'timeout'
  | 'frequency'
  | 'lookbackPeriod'
  | 'fieldHistoryLength'
  | 'maxLogsPerPage'
  | 'maxTimeWindowSize'
  | 'maxLogsPerWindow'
  | 'maxLogsPerWindowCapBehavior'
>;

/**
 * State and resolved config of the non-priority extraction process, for types that run one.
 * The config fields mirror the engine's top-level ones, which describe the priority process.
 */
interface NonPriorityEngineStatus extends LogExtractionStatusFields {
  status: EngineStatus | null;
  error: EngineError | null;
  lastExecutionTimestamp: string | undefined;
  /**
   * Fixed non-priority sampling rate, `null` when unset. Unset is the normal case: the process
   * then computes a rate per slice from the remaining volume budget.
   */
  samplingRate: number | null;
}

type StatusEngine = Omit<
  GetStatusSuccessResult['engines'][number],
  | 'versionState'
  | 'logExtractionState'
  | 'logExtractionConfig'
  | 'nonPriorityLogExtractionConfig'
  | 'nonPriorityLogExtractionState'
  | 'nonPriorityStatus'
  | 'nonPriorityError'
> &
  LegacyEngineDescriptorV1 & { nonPriority?: NonPriorityEngineStatus };

export interface EntityStoreStatusResponseBody {
  status: EntityStoreStatus;
  engines: StatusEngine[];
  excludedUserNames?: string[];
}

const querySchema = lazySchema(() =>
  z.object({
    include_components: BooleanFromString.optional()
      .default(false)
      .describe('If true, returns a detailed status of each engine including all its components.'),
  })
);
export type StatusRequestQuery = z.infer<typeof querySchema>;

const toLogExtractionStatusFields = ({
  delay,
  timeout,
  frequency,
  lookbackPeriod,
  fieldHistoryLength,
  maxLogsPerPage,
  maxTimeWindowSize,
  maxLogsPerWindow,
  maxLogsPerWindowCapBehavior,
}: LogExtractionConfig): LogExtractionStatusFields => ({
  delay,
  timeout,
  frequency,
  lookbackPeriod,
  fieldHistoryLength,
  maxLogsPerPage: capAtMaxLogsPerWindow(maxLogsPerPage, maxLogsPerWindow),
  maxTimeWindowSize,
  maxLogsPerWindow,
  maxLogsPerWindowCapBehavior,
});

function toPublicEngine(
  engine: GetStatusSuccessResult['engines'][number],
  logsExtractionConfig: LogExtractionConfig,
  nonPriorityLogsExtractionConfig: LogExtractionConfig | undefined
): StatusEngine {
  const {
    versionState,
    logExtractionState,
    logExtractionConfig,
    nonPriorityLogExtractionConfig,
    nonPriorityLogExtractionState,
    nonPriorityStatus,
    nonPriorityError,
    ...rest
  } = engine;

  return {
    ...rest,
    // TODO: Remove the legacy fields once we stop supporting V1.
    filter: '',
    ...toLogExtractionStatusFields(logsExtractionConfig),
    docsPerSecond: -1,
    indexPattern: '',
    enrichPolicyExecutionInterval: null,
    timestampField: '@timestamp',
    maxPageSearchSize: 10000,
    lastExecutionTimestamp: logExtractionState.lastExecutionTimestamp ?? undefined,
    // getStatus resolves a non-priority config only for types that run that process: types with a
    // priority gate, with the flag on. With the flag off the non-priority task skips every run
    // without updating its stored status, so reporting it would show a stale `started`.
    ...(nonPriorityLogsExtractionConfig
      ? {
          nonPriority: {
            status: nonPriorityStatus ?? null,
            error: nonPriorityError ?? null,
            lastExecutionTimestamp:
              nonPriorityLogExtractionState?.lastExecutionTimestamp ?? undefined,
            // Read off the descriptor: this reports what was configured, not the rate
            // getMergedConfig resolves for a run.
            samplingRate: nonPriorityLogExtractionConfig?.samplingRate ?? null,
            ...toLogExtractionStatusFields(nonPriorityLogsExtractionConfig),
          },
        }
      : {}),
  };
}

export function registerStatus(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.STATUS,
      access: 'public',
      summary: 'Get Entity Store status',
      description:
        'Get the overall Entity Store status and per-engine statuses, optionally including component-level health details. ' +
        'Each engine reports the log extraction settings that apply to its entity type.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildStrictRouteValidationWithZod(querySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_status.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse<EntityStoreStatusResponseBody>> => {
          const entityStoreCtx = await ctx.entityStore;
          const { logger, assetManagerClient: assetManager } = entityStoreCtx;
          logger.debug('Status API invoked');
          const withComponents = req.query.include_components;
          const { status, engines, ...rest } = await assetManager.getStatus(withComponents);

          if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
            return res.ok({
              body: { status, engines: [] },
            });
          }

          const {
            logsExtractionConfig,
            logsExtractionConfigByType,
            nonPriorityLogsExtractionConfigByType,
            excludedUserNames,
          } = rest as GetStatusSuccessResult;

          return res.ok({
            body: {
              status,
              engines: engines.map((engine) =>
                toPublicEngine(
                  engine,
                  logsExtractionConfigByType[engine.type] ?? logsExtractionConfig,
                  nonPriorityLogsExtractionConfigByType[engine.type]
                )
              ),
              excludedUserNames,
            },
          });
        }
      )
    );
}
