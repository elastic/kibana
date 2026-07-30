/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostname as osHostname } from 'os';
import type { InferenceConnector, InferenceConnectorType, Model } from '@kbn/inference-common';
import { getConnectorFamily, getConnectorModel, getConnectorProvider } from '@kbn/inference-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvalsClient, EvaluationReporter, EvalsExecutorClient } from '@kbn/evals';
import { buildIngestRequest, getGitMetadata, getBuildkiteCiMetadataFromEnv } from '@kbn/evals';
import { KibanaPhoenixClient } from './client';
import { getPhoenixConfig } from './get_phoenix_config';

function buildModelFromConnector(connectorWithId: AvailableConnectorWithId): Model {
  const inferenceConnector: InferenceConnector = {
    type: connectorWithId.actionTypeId as InferenceConnectorType,
    config: connectorWithId.config,
    connectorId: connectorWithId.id,
    name: connectorWithId.name,
    capabilities: { contextWindowSize: 32000 },
    isPreconfigured: false,
    isInferenceEndpoint: false,
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
 * replicates the teardown that the base fixture normally performs: ingesting
 * evaluation results through the evals plugin and printing the terminal report.
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
          evalsClient,
          reportModelScore,
        }: {
          log: SomeDevLog;
          connector: AvailableConnectorWithId;
          evaluationConnector: AvailableConnectorWithId;
          repetitions: number;
          evalsClient: EvalsClient;
          reportModelScore: EvaluationReporter;
        },
        use: (client: EvalsExecutorClient) => Promise<void>
      ) => {
        const executionId = process.env.TEST_RUN_ID;

        const model = buildModelFromConnector(connector);
        const evaluatorModel = buildModelFromConnector(evaluationConnector);
        const suiteId = process.env.EVAL_SUITE_ID;
        const buildkiteMetadata = getBuildkiteCiMetadataFromEnv();
        const gitMetadata = getGitMetadata();
        const hostName = osHostname();

        const phoenixClient = new KibanaPhoenixClient({
          config: getPhoenixConfig(),
          log,
          model,
          executionId,
          repetitions,
        });

        await use(phoenixClient);

        const datasetRunResults = await phoenixClient.getDatasetRunResults();

        for (const result of datasetRunResults) {
          const ingestRequests = buildIngestRequest({
            source: { kind: 'experiments', experiments: [result] },
            taskModel: model,
            evaluatorModel,
            repetitions,
            hostName,
            gitMetadata,
            suiteId,
            buildkiteMetadata,
            log,
          });

          try {
            await Promise.all(
              ingestRequests.map((ingestRequest) => evalsClient.ingestScores(ingestRequest))
            );
          } catch (error) {
            log.error(
              `Failed to ingest evaluation results for experiment "${result.experimentName}" (${
                result.id
              }). ${String(error)}`
            );
            throw error;
          }

          await reportModelScore(evalsClient, result.id, log, {
            taskModelId: model.id,
            suiteId,
          });
        }
      },
      { scope: 'worker' },
    ],
  }) as unknown as T;
}
