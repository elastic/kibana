/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector, InferenceConnectorType, Model } from '@kbn/inference-common';
import { getConnectorFamily, getConnectorModel, getConnectorProvider } from '@kbn/inference-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { EsClient } from '@kbn/scout';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationReporter, EvalsExecutorClient } from '@kbn/evals';
import {
  EvaluationScoreRepository,
  mapToEvaluationScoreDocuments,
  exportEvaluations,
} from '@kbn/evals';
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
 * When active, the override replaces the base `executorClient` entirely, so it
 * replicates the teardown that the base fixture normally performs: exporting
 * evaluation results to Elasticsearch and printing the terminal report.
 *
 * When `KBN_EVALS_EXECUTOR` is not `phoenix`, the base is returned unchanged.
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
  if (process.env.KBN_EVALS_EXECUTOR !== 'phoenix') {
    return base;
  }

  return base.extend({
    executorClient: [
      async (
        {
          log,
          connector,
          evaluationConnector,
          repetitions,
          evaluationsEsClient,
          reportModelScore,
        }: {
          log: SomeDevLog;
          connector: AvailableConnectorWithId;
          evaluationConnector: AvailableConnectorWithId;
          repetitions: number;
          evaluationsEsClient: EsClient;
          reportModelScore: EvaluationReporter;
        },
        use: (client: EvalsExecutorClient) => Promise<void>
      ) => {
        const runId = process.env.TEST_RUN_ID;
        if (!runId) {
          throw new Error('TEST_RUN_ID environment variable is required for the Phoenix executor');
        }

        const model = buildModelFromConnector(connector);
        const evaluatorModel = buildModelFromConnector(evaluationConnector);

        const phoenixClient = new KibanaPhoenixClient({
          config: getPhoenixConfig(),
          log,
          model,
          runId,
          repetitions,
        });

        await use(phoenixClient);

        const scoreRepository = new EvaluationScoreRepository(evaluationsEsClient, log);
        const experiments = await phoenixClient.getRanExperiments();
        const documents = await mapToEvaluationScoreDocuments({
          experiments,
          taskModel: model,
          evaluatorModel,
          runId,
          totalRepetitions: repetitions,
        });

        try {
          await exportEvaluations(documents, scoreRepository, log);
        } catch (error) {
          log.error(
            `Failed to export evaluation results to Elasticsearch for run ID: ${runId}. ${error}`
          );
          throw error;
        }

        await reportModelScore(scoreRepository, runId, log, {
          taskModelId: model.id,
          suiteId: process.env.EVAL_SUITE_ID,
        });
      },
      { scope: 'worker' },
    ],
  }) as unknown as T;
}
