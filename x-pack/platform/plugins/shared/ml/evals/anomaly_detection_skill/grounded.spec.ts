/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grounded-output evals for the ML anomaly-detection skill.
 *
 * Unlike routing.spec.ts (skill/tool selection only), these install the "Sample web logs" dataset,
 * set up Elastic's built-in `sample_data_weblogs` recognizer module against it (the same jobs the ML
 * UI itself creates for this dataset), run the datafeeds over the full historical range, and verify
 * the response references the actual highest-scoring anomaly that was found (job ID, response code,
 * and score), not an assumed value.
 *
 * Evaluators: RequiredTermsInResponse, ExpectedSkillInvocation, Factuality, Groundedness. The CODE
 * evaluator skips gracefully (score 1) if seeding failed or no anomalies were produced.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';
import {
  seedAnomalyDetectionModule,
  type SeededAnomalyDetectionFixtures,
} from './anomaly_detection_fixtures';

evaluate.describe(
  'ML Anomaly Detection - grounded output',
  { tag: [...tags.stateful.classic] },
  () => {
    let fixtures: SeededAnomalyDetectionFixtures | undefined;
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
      const seeded = await seedAnomalyDetectionModule({ esClient, kbnClient, log });
      fixtures = seeded?.fixtures;
      teardown = seeded?.cleanup;
    });

    evaluate.afterAll(async () => {
      await teardown?.();
    });

    evaluate(
      'response cites the highest-scoring anomaly found in the sample web logs data',
      async ({ evaluateDataset }) => {
        const topAnomaly = fixtures?.topAnomaly;
        const jobId = fixtures?.jobIds.responseCodeRates;

        await evaluateDataset({
          dataset: {
            name: 'agent builder: ml-anomaly-detection-grounded-output',
            description:
              'Validates that the anomaly-detection skill response references the highest-scoring ' +
              'anomaly record produced by the response_code_rates job over the Sample web logs dataset.',
            examples: [
              {
                input: {
                  question: `What anomalies were detected by the ${
                    jobId ?? '<job-id>'
                  } job? Tell me the most significant one.`,
                },
                output: {
                  expected:
                    `The most significant anomaly in job ${
                      jobId ?? '<job-id>'
                    } is an unusual event rate ` +
                    `for HTTP response code ${
                      topAnomaly?.responseCode ?? '<response-code>'
                    }, with a ` +
                    `record score of about ${topAnomaly?.recordScore ?? '<score>'} around ` +
                    `${
                      topAnomaly?.timestamp ?? '<timestamp>'
                    }. Presentation order and phrasing of ` +
                    'these facts does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Anomaly Detection Grounded Output',
                  expectedSkill: 'anomaly-detection',
                  // Anomaly records live in .ml-anomalies-* and are read via ES|QL templates
                  // (ad_query_anomaly_records) through ml.query_anomalies, not the ML job-info API tool.
                  expectedToolId: 'ml.query_anomalies',
                  // Use the integer portion of the score so answers that echo the tool's
                  // raw value (e.g. "45.88") still match. Avoid Math.round here — a rounded
                  // required term like "46" fails substring match against "45.88".
                  requiredTerms:
                    topAnomaly && jobId
                      ? [jobId, topAnomaly.responseCode, String(Math.trunc(topAnomaly.recordScore))]
                      : [],
                },
              },
            ],
          },
        });
      }
    );
  }
);
