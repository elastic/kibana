/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags, type Evaluator } from '@kbn/evals';
import { createChartIntentJudge } from '../../src/evaluators/chart_type_vs_intent';
import {
  CHART_INTENT_CALIBRATION_PAIRS,
  type ChartIntentCalibrationPair,
} from './chart_intent_pairs';

type CalibrationInput = Pick<ChartIntentCalibrationPair, 'question' | 'gold' | 'actual'>;
type CalibrationExpected = Pick<ChartIntentCalibrationPair, 'verdict' | 'rationale'>;
interface CalibrationOutput {
  verdict: string;
  reason: string;
}

/** CODE evaluator: 1 when the judge's verdict equals the human verdict. */
const judgeAgreement: Evaluator = {
  name: 'Chart Intent Judge Agreement',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { verdict, reason } = output as CalibrationOutput;
    const { verdict: humanVerdict, rationale } = expected as CalibrationExpected;
    const agrees = verdict === humanVerdict;
    return {
      score: agrees ? 1 : 0,
      label: agrees ? 'agrees' : 'disagrees',
      explanation: agrees
        ? `Judge and human both say ${verdict}.`
        : `Judge said ${verdict} (${reason}); human says ${humanVerdict} (${rationale}).`,
      metadata: { judgeVerdict: verdict, humanVerdict, reason, rationale },
    };
  },
};

evaluate.describe(
  'Agent Builder Visualizations - Chart Intent Judge Calibration',
  { tag: tags.serverless.search },
  () => {
    evaluate(
      'agrees with human verdicts on fixed chart-form pairs',
      async ({ executorClient, inferenceClient, log }) => {
        const judge = createChartIntentJudge({ inferenceClient, log });

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'agent builder visualizations: chart intent judge calibration',
                description:
                  'Fixed gold / produced chart-form pairs with human verdicts. Measures judge agreement so rubric or model drift is visible separately from agent quality.',
                examples: CHART_INTENT_CALIBRATION_PAIRS.map(
                  ({ question, gold, actual, verdict, rationale }) => ({
                    input: { question, gold, actual } as CalibrationInput & Record<string, unknown>,
                    output: { verdict, rationale },
                    metadata: { chartFamily: 'judge_calibration' },
                  })
                ),
              },
            ],
            task: async ({ input }) => {
              const { question, gold, actual } = input as CalibrationInput;
              return judge({ question, gold, actual });
            },
          },
          [judgeAgreement]
        );
      }
    );
  }
);
