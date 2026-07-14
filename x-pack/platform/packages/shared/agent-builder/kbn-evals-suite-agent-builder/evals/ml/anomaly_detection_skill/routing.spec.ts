/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';

evaluate.describe('ML Anomaly Detection - routing', { tag: [...tags.stateful.classic] }, () => {
  evaluate(
    'job health and investigation queries activate the anomaly-detection skill and tool',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-routing',
          description:
            'Validates that ML anomaly detection job/status questions activate the anomaly-detection ' +
            'skill and read job state via the ad_get_job_info tool.',
          examples: [
            {
              input: {
                question: 'What anomaly detection jobs do I have, and are any of them unhealthy?',
              },
              output: {
                expected:
                  'Lists the anomaly detection jobs and reports on their state (opened/closed) and ' +
                  'health (e.g. memory status), reading job info via the anomaly-detection skill tools.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Job Health',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.ad_get_job_info',
              },
            },
            {
              input: {
                question:
                  "One of my anomaly detection jobs looks stuck. Can you check its datafeed's state and any recent job messages?",
              },
              output: {
                expected:
                  'Retrieves the datafeed configuration/state and recent job messages for the job in ' +
                  'question to diagnose why it looks stuck.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Job Health',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.ad_get_job_info',
              },
            },
          ],
        },
      });
    }
  );

  evaluate(
    'job creation requests activate the anomaly-detection skill and create-job tool',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-job-creation',
          description:
            'Validates that requests to configure a new ML job activate the anomaly-detection skill ' +
            'and use the ad_create_job tool.',
          examples: [
            {
              input: {
                question:
                  'Set up an anomaly detection job that flags unusual spikes in HTTP response codes on my web server logs.',
              },
              output: {
                expected:
                  'Proposes an anomaly detection job (and datafeed) configuration targeting the web ' +
                  'server logs index with a detector suited to unusual response code rates (e.g. count ' +
                  'partitioned by response code), then creates it.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Job Creation',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.ad_create_job',
              },
            },
          ],
        },
      });
    }
  );

  evaluate(
    'lifecycle requests activate the anomaly-detection skill and manage-job-state tool',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-lifecycle',
          description:
            'Validates that job/datafeed lifecycle requests (start/stop/open/close) activate the ' +
            'anomaly-detection skill and use the ad_manage_job_state tool.',
          examples: [
            {
              input: {
                question:
                  "My anomaly detection job's datafeed stopped. Can you start it again in real time?",
              },
              output: {
                expected:
                  'Starts the datafeed for the referenced job (opening the job first if needed) so it ' +
                  'resumes processing in real time.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Job Lifecycle',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.ad_manage_job_state',
              },
            },
          ],
        },
      });
    }
  );

  evaluate(
    'configuration update requests activate the anomaly-detection skill and update-job-config tool',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-config-update',
          description:
            'Validates that requests to change job configuration (e.g. model memory limit) activate ' +
            'the anomaly-detection skill and use the ad_update_job_config tool.',
          examples: [
            {
              input: {
                question:
                  'My anomaly detection job keeps hitting its memory limit. Can you raise the model memory limit to 50mb?',
              },
              output: {
                expected:
                  'Follows the stop-datafeed → close-job → update-memory-limit → open-job → start-datafeed ' +
                  'lifecycle to safely raise the model memory limit to 50mb.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Job Configuration',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.ad_update_job_config',
              },
            },
          ],
        },
      });
    }
  );

  evaluate(
    'unrelated queries do not activate the anomaly-detection skill',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-boundary',
          description:
            'Negative test: validates that queries unrelated to ML anomaly detection do not activate ' +
            'the anomaly-detection skill.',
          examples: [
            {
              input: {
                question: 'What is the capital of France?',
              },
              output: {
                expected: 'Answers the general knowledge question without invoking any ML tooling.',
              },
              metadata: {
                query_intent: 'Unrelated General Knowledge',
                shouldNotActivateSkill: 'anomaly-detection',
              },
            },
          ],
        },
      });
    }
  );
});
