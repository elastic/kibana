/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Observability Skills - Service Investigation', () => {
  evaluate('service investigation queries activate the correct skill and tools', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder: o11y-service-investigation-skill',
        description:
          'Validates that APM/service investigation queries activate the service-investigation skill',
        examples: [
          {
            input: {
              question:
                'My checkout service is experiencing high latency. Help me investigate what is causing the slowdown.',
            },
            output: {
              expected:
                'I will investigate the checkout service by first retrieving its metrics (latency, throughput, error rate), then drilling into individual transactions and traces to identify where the slowdown is occurring.',
            },
            metadata: {
              query_intent: 'Service Investigation',
              expectedSkill: 'service-investigation',
            },
          },
          {
            input: {
              question:
                'What services are currently running in my production environment and which ones are unhealthy?',
            },
            output: {
              expected:
                'I will list all instrumented services and their health metrics to identify any with elevated error rates, high latency, or throughput anomalies.',
            },
            metadata: {
              query_intent: 'Service Discovery',
              expectedSkill: 'service-investigation',
              expectedOnlyToolId: 'observability.get_services',
            },
          },
          {
            input: {
              question:
                'Show me the service dependency map for the payments service. What are its upstream and downstream dependencies?',
            },
            output: {
              expected:
                'I will retrieve the service topology for the payments service to map its upstream callers and downstream dependencies, along with their connection metrics.',
            },
            metadata: {
              query_intent: 'Dependency Analysis',
              expectedSkill: 'service-investigation',
              expectedOnlyToolId: 'observability.get_service_topology',
            },
          },
          {
            input: {
              question:
                'The cart-service JVM seems to be having garbage collection issues. Check the runtime metrics.',
            },
            output: {
              expected:
                'I will check the runtime metrics for cart-service, focusing on JVM heap usage, GC pause times, and thread counts to identify garbage collection pressure.',
            },
            metadata: {
              query_intent: 'Runtime Investigation',
              expectedSkill: 'service-investigation',
              expectedOnlyToolId: 'observability.get_runtime_metrics',
            },
          },
          {
            input: {
              question:
                'Find me a sample trace for the POST /api/checkout transaction on the payments service that took more than 2 seconds.',
            },
            output: {
              expected:
                'I will search for traces of the POST /api/checkout transaction on the payments service to find samples exceeding 2 seconds, allowing us to examine the span breakdown.',
            },
            metadata: {
              query_intent: 'Trace Analysis',
              expectedSkill: 'service-investigation',
              expectedOnlyToolId: 'observability.get_traces',
            },
          },
        ],
      },
    });
  });
});

evaluate.describe('Observability Skills - Log Analysis', () => {
  evaluate('log analysis queries activate the correct skill and tools', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder: o11y-log-analysis-skill',
        description:
          'Validates that log investigation queries activate the log-analysis skill',
        examples: [
          {
            input: {
              question:
                'There was a sudden spike in error logs around 2pm today. Help me understand what changed.',
            },
            output: {
              expected:
                'I will analyze the log rate changes around 2pm using log rate analysis to identify which field/value combinations explain the spike, then examine log patterns to understand the error types.',
            },
            metadata: {
              query_intent: 'Log Investigation',
              expectedSkill: 'log-analysis',
            },
          },
          {
            input: {
              question:
                'What are the most common error patterns in our application logs from the last hour?',
            },
            output: {
              expected:
                'I will discover recurring log message patterns from the last hour, grouped by similarity, to identify the most frequent error categories and their counts.',
            },
            metadata: {
              query_intent: 'Log Patterns',
              expectedSkill: 'log-analysis',
              expectedOnlyToolId: 'observability.get_log_groups',
            },
          },
          {
            input: {
              question:
                'Run a log rate analysis on the frontend service logs to find what is driving the volume increase in the last 30 minutes.',
            },
            output: {
              expected:
                'I will run log rate analysis on the frontend service logs for the last 30 minutes to statistically identify which fields and values are most responsible for the volume change.',
            },
            metadata: {
              query_intent: 'Log Rate Analysis',
              expectedSkill: 'log-analysis',
              expectedOnlyToolId: 'observability.run_log_rate_analysis',
            },
          },
        ],
      },
    });
  });
});

evaluate.describe('Observability Skills - Infrastructure & Alerting', () => {
  evaluate('infrastructure and alerting queries activate the correct skill and tools', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder: o11y-infrastructure-alerting-skill',
        description:
          'Validates that infrastructure monitoring and alert triage queries activate the infrastructure-alerting skill',
        examples: [
          {
            input: {
              question:
                'Show me all active observability alerts and help me prioritize which ones need immediate attention.',
            },
            output: {
              expected:
                'I will fetch active observability alerts, assess their severity, group them by affected entity, and prioritize based on impact and urgency.',
            },
            metadata: {
              query_intent: 'Alert Triage',
              expectedSkill: 'infrastructure-alerting',
              expectedOnlyToolId: 'observability.get_alerts',
            },
          },
          {
            input: {
              question:
                'Our web servers seem to be running out of memory. Check the host metrics for the web-* hosts.',
            },
            output: {
              expected:
                'I will retrieve host metrics for the web-* hosts, focusing on memory usage, CPU, and disk I/O to assess whether they are approaching resource saturation.',
            },
            metadata: {
              query_intent: 'Host Investigation',
              expectedSkill: 'infrastructure-alerting',
              expectedOnlyToolId: 'observability.get_hosts',
            },
          },
          {
            input: {
              question:
                'Are there any ML anomaly detection jobs configured for our observability data? What anomalies have been detected recently?',
            },
            output: {
              expected:
                'I will check configured ML anomaly detection jobs, their health status, and review recent anomaly records for statistically significant deviations in your observability metrics.',
            },
            metadata: {
              query_intent: 'Anomaly Detection',
              expectedSkill: 'infrastructure-alerting',
              expectedOnlyToolId: 'observability.get_anomaly_detection_jobs',
            },
          },
        ],
      },
    });
  });
});

evaluate.describe('Observability Skills - Distractor Queries', () => {
  evaluate('non-observability queries do not activate observability skills', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder: o11y-skills-distractor',
        description:
          'Validates that non-observability queries do NOT activate observability skills (negative test)',
        examples: [
          {
            input: {
              question: 'Help me investigate a credential access alert on host WIN-SRV01.',
            },
            output: {
              expected:
                'I will investigate this security alert. This is a security investigation task, not an observability task.',
            },
            metadata: {
              query_intent: 'Security',
              shouldNotActivateSkill: 'service-investigation',
            },
          },
          {
            input: {
              question: 'Create a KQL detection rule for suspicious PowerShell execution.',
            },
            output: {
              expected:
                'I will create a detection rule. This is a security detection engineering task.',
            },
            metadata: {
              query_intent: 'Security',
              shouldNotActivateSkill: 'log-analysis',
            },
          },
          {
            input: {
              question: 'Build me a dashboard showing revenue metrics by product category.',
            },
            output: {
              expected:
                'I will create a dashboard with revenue visualizations. This is a dashboard management task.',
            },
            metadata: {
              query_intent: 'Dashboard',
              shouldNotActivateSkill: 'infrastructure-alerting',
            },
          },
        ],
      },
    });
  });
});
