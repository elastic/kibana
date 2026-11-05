/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { tags } from '@kbn/scout';
import { buildEvaluationDataset } from '../src/dataset';
import { evaluate } from '../src/evaluate';
import { createAutomaticImportEvaluators } from '../src/evaluators';
import { createExtraFieldJudge } from '../src/extra_field_judge';
import { createIterationsEvaluator } from '../src/iterations_evaluator';
import type { AutomaticImportRunOutput } from '../src/types';

/** `vendor_a_signon` becomes integration `vendor_a_<random>` with data stream `signon`. */
const toRunIds = (datasetId: string): { integrationId: string; dataStreamId: string } => {
  const [vendor, letter, ...rest] = datasetId.split('_');
  return {
    integrationId: `${vendor}_${letter}_${randomBytes(4).toString('hex')}`,
    dataStreamId: rest.join('_'),
  };
};

evaluate.describe('Automatic Import', { tag: tags.stateful.classic }, () => {
  evaluate(
    'ECS mapping',
    async ({
      executorClient,
      automaticImportClient,
      ecsFields,
      connector,
      evaluators,
      traceEsClient,
      log,
    }) => {
      const { latency, inputTokens, outputTokens } = evaluators.traceBasedEvaluators;
      await executorClient.runExperiment(
        {
          datasets: [buildEvaluationDataset()],
          task: async ({ input }): Promise<AutomaticImportRunOutput> => {
            if (!input) {
              throw new Error('Missing example input');
            }
            const { datasetId, title, description, lines } = input;
            return automaticImportClient.analyze({
              ...toRunIds(datasetId),
              title,
              description,
              lines,
              connectorId: connector.id,
            });
          },
        },
        [
          ...createAutomaticImportEvaluators(
            ecsFields,
            createExtraFieldJudge(ecsFields, evaluators.criteria)
          ),
          createIterationsEvaluator({ traceEsClient, log }),
          latency,
          inputTokens,
          outputTokens,
        ]
      );
    }
  );
});
