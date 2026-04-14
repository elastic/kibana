/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { InferenceConnector, Model } from '@kbn/inference-common';
import { getConnectorFamily, getConnectorModel, getConnectorProvider } from '@kbn/inference-common';
import {
  KibanaEvalsClient,
  exportEvaluationScoreDocuments,
  mapToEvaluationScoreDocuments,
} from '@kbn/evals-runner';
import type { EvalsLogger } from '@kbn/evals-runner';
import type { ScoreExporterClient } from '@kbn/evals-runner';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { OnlineSuiteRegistry } from '../online_suites/registry';
import { evalsRunSuiteCommonStepDefinition } from '../../common/workflows_steps/run_suite';

function toEvalsLogger(logger: {
  info(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
  error(message: string, error?: Error): void;
}): EvalsLogger {
  return {
    info: (message) => logger.info(message),
    debug: (message) => logger.debug(message),
    warning: (message) => logger.warn(message),
    error: (message) => logger.error(message),
  };
}

function toModelFromConnector(connector: InferenceConnector): Model {
  return {
    id: getConnectorModel(connector),
    family: getConnectorFamily(connector),
    provider: getConnectorProvider(connector),
  };
}

export const getEvalsRunSuiteStepDefinition = (options: {
  coreSetup: CoreSetup<{ inference?: InferenceServerStart }>;
  onlineSuiteRegistry: OnlineSuiteRegistry;
}) => {
  const { coreSetup, onlineSuiteRegistry } = options;

  return createServerStepDefinition({
    ...evalsRunSuiteCommonStepDefinition,
    handler: async (context) => {
      try {
        if (context.abortSignal.aborted) {
          return { error: new Error('Step aborted') };
        }

        const stepContext = context.contextManager.getContext();
        const runId = stepContext.metadata?.run_id;
        if (typeof runId !== 'string' || runId.length === 0) {
          return { error: new Error('workflow metadata.run_id is required') };
        }

        const suiteId = context.input.suite_id;
        const suite = onlineSuiteRegistry.getById(suiteId);
        if (!suite) {
          return { error: new Error(`Unknown suite_id: ${suiteId}`) };
        }

        const suiteParams = suite.inputSchema.parse(context.input.suite_params ?? {});
        const repetitions = context.input.repetitions ?? 3;

        const [coreStart, pluginsStart] = await coreSetup.getStartServices();
        const inferenceStart = (pluginsStart as { inference?: InferenceServerStart }).inference;
        if (!inferenceStart) {
          return { error: new Error('inference plugin is not available') };
        }

        const request = context.contextManager.getFakeRequest();
        const esClient = context.contextManager.getScopedEsClient();
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const spaceId = stepContext.workflow.spaceId;

        const taskConnector = await inferenceStart.getConnectorById(
          context.input.task_connector_id,
          request
        );
        const judgeConnector = await inferenceStart.getConnectorById(
          context.input.judge_connector_id,
          request
        );

        const taskModel = toModelFromConnector(taskConnector);
        const judgeModel = toModelFromConnector(judgeConnector);

        const inferenceClient = inferenceStart.getClient({
          request,
          bindTo: { connectorId: context.input.task_connector_id },
        });
        const judgeInferenceClient = inferenceStart.getClient({
          request,
          bindTo: { connectorId: context.input.judge_connector_id },
        });

        const executorClient = new KibanaEvalsClient({
          log: toEvalsLogger(context.logger),
          model: taskModel,
          runId,
          repetitions,
        });

        await suite.run({
          runId,
          spaceId,
          suiteParams,
          esClient,
          savedObjectsClient,
          inferenceClient,
          judgeInferenceClient,
          executorClient,
          taskModel,
          judgeModel,
          logger: context.logger,
          abortSignal: context.abortSignal,
        });

        const experiments = await executorClient.getRanExperiments();
        const documents = await mapToEvaluationScoreDocuments({
          experiments,
          taskModel,
          evaluatorModel: judgeModel,
          runId,
          totalRepetitions: repetitions,
          suiteId,
        });

        const exported = await exportEvaluationScoreDocuments(
          esClient as unknown as ScoreExporterClient,
          documents,
          {
            index: 'kibana-evaluations',
            refresh: 'wait_for',
          }
        );

        return {
          output: {
            run_id: runId,
            suite_id: suiteId,
            exported,
          },
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        context.logger.error('evals.runSuite step failed', err);
        return { error: err };
      }
    },
  });
};
