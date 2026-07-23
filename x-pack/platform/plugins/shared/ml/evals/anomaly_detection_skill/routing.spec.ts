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
    'anomaly investigation queries activate the anomaly-detection skill and query_anomalies tool',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-investigate',
          description:
            'Validates that RCA / "what broke?" questions activate the anomaly-detection skill and ' +
            'query anomaly results via ml.query_anomalies.',
          examples: [
            {
              input: {
                question:
                  'Something caused a spike in our error rate around 2pm — what broke, and which entity looks like the root cause?',
              },
              output: {
                expected:
                  'Investigates cross-job anomaly timelines and shared influencers via ES|QL, then ' +
                  'reports a root-cause entity with affected jobs and severity.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Investigation',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.query_anomalies',
              },
            },
            {
              input: {
                question:
                  'My anomaly score went from 90 to 55 overnight — did the model renormalize, or is something wrong with the job?',
              },
              output: {
                expected:
                  'Compares initial_record_score vs record_score (and related explanation fields) via ' +
                  'ES|QL to explain renormalization drift before blaming config.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Score Explanation',
                expectedSkill: 'anomaly-detection',
                expectedToolId: 'ml.query_anomalies',
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
            'Validates that requests to change job configuration (memory limit, calendars) activate ' +
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
            {
              input: {
                question:
                  'Create a new calendar called seasonal_sales_events for my anomaly detection jobs with ' +
                  "Sept 1 to 16 called 'back to school' and November 27, 2026 for 'black friday'.",
              },
              output: {
                expected:
                  'Validates existing calendar events via ad_get_job_info, then creates/updates the ' +
                  'seasonal_sales_events calendar once via ad_update_job_config with both named windows ' +
                  '(back to school and black friday) attached to the target job(s).',
              },
              metadata: {
                query_intent: 'Anomaly Detection Calendar Events',
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
    'calendar lookup requests activate the anomaly-detection skill and get-job-info tool',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: ml-anomaly-detection-skill-calendar-lookup',
          description:
            'Validates that requests to inspect ML calendars/scheduled events activate the ' +
            'anomaly-detection skill and use ad_get_job_info (get_calendar_events).',
          examples: [
            {
              input: {
                question:
                  'Which ML calendars and scheduled events are associated with my anomaly detection job?',
              },
              output: {
                expected:
                  'Lists calendars and scheduled events associated with the referenced anomaly ' +
                  'detection job via the get_calendar_events operation.',
              },
              metadata: {
                query_intent: 'Anomaly Detection Calendar Lookup',
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
