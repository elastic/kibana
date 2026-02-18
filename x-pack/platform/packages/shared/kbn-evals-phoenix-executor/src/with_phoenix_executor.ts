/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector, InferenceConnectorType, Model } from '@kbn/inference-common';
import { getConnectorFamily, getConnectorModel, getConnectorProvider } from '@kbn/inference-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvalsExecutorClient } from '@kbn/evals';
import { KibanaPhoenixClient } from './client';
import { getPhoenixConfig } from './get_phoenix_config';

function buildModelFromConnector(connectorWithId: AvailableConnectorWithId): Model {
  const inferenceConnector: InferenceConnector = {
    type: connectorWithId.actionTypeId as InferenceConnectorType,
    config: connectorWithId.config,
    connectorId: connectorWithId.id,
    name: connectorWithId.name,
    capabilities: { contextWindowSize: 32000 },
  };

  return {
    family: getConnectorFamily(inferenceConnector),
    provider: getConnectorProvider(inferenceConnector),
    id: getConnectorModel(inferenceConnector),
  };
}

/**
 * Wraps a Playwright test base (from `@kbn/evals`) to override the `executorClient`
 * fixture with a Phoenix-backed executor when `KBN_EVALS_EXECUTOR=phoenix` is set.
 *
 * Uses an intermediate `_baseExecutorClient` alias to capture the original fixture
 * before overriding it — this is a standard Playwright pattern for referencing the
 * base fixture from within an override of the same name.
 *
 * Usage:
 * ```ts
 * import { evaluate as evalsBase } from '@kbn/evals';
 * import { withPhoenixExecutor } from '@kbn/evals-phoenix-executor';
 *
 * const base = withPhoenixExecutor(evalsBase);
 * export const evaluate = base.extend({ ...suite-specific fixtures... });
 * ```
 */
export function withPhoenixExecutor<T extends { extend: (...args: any[]) => any }>(base: T): T {
  return base
    .extend({
      _baseExecutorClient: [
        async (
          { executorClient }: { executorClient: EvalsExecutorClient },
          use: (client: EvalsExecutorClient) => Promise<void>
        ) => {
          await use(executorClient);
        },
        { scope: 'worker' },
      ],
    })
    .extend({
      executorClient: [
        async (
          {
            _baseExecutorClient,
            log,
            connector,
            repetitions,
          }: {
            _baseExecutorClient: EvalsExecutorClient;
            log: SomeDevLog;
            connector: AvailableConnectorWithId;
            repetitions: number;
          },
          use: (client: EvalsExecutorClient) => Promise<void>
        ) => {
          if (process.env.KBN_EVALS_EXECUTOR !== 'phoenix') {
            await use(_baseExecutorClient);
            return;
          }

          const runId = process.env.TEST_RUN_ID;
          if (!runId) {
            throw new Error(
              'TEST_RUN_ID environment variable is required for the Phoenix executor'
            );
          }

          await use(
            new KibanaPhoenixClient({
              config: getPhoenixConfig(),
              log,
              model: buildModelFromConnector(connector),
              runId,
              repetitions,
            })
          );
        },
        { scope: 'worker' },
      ],
    }) as unknown as T;
}
