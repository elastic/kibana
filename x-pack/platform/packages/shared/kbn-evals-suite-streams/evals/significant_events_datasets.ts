/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import type { EvaluationCriterion } from '@kbn/evals/src/evaluators/criteria';
import { GROK_PATTERN_DATASETS } from './pattern_extraction_datasets';
import type { SignificantEventsGroundTruth } from './significant_events_metrics';

export interface SignificantEventsEvaluationExample {
  input: {
    stream_name: string;
    // A description of the stream (e.g., 'Nginx access logs with 5xx errors')
    stream_description: string;
    // Sample log messages that characterize the stream
    sample_logs: string[];
    // How to ingest the sample logs
    ingest_mode?: 'single_doc' | 'multi_doc';
    // Features already identified for this stream (computed + inferred)
    features: Feature[];
  };
  output: {
    expected_query: SignificantEventsGroundTruth;
    criteria: EvaluationCriterion[];
  };
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
    test_index?: string;
  };
}

export interface SignificantEventsEvaluationDataset {
  name: string;
  description: string;
  examples: SignificantEventsEvaluationExample[];
}

type AdditionalFeature = Omit<Feature, 'uuid' | 'status' | 'last_seen' | 'stream_name'>;

const feature = (baseFeature: Omit<Feature, 'uuid' | 'status' | 'last_seen'>): Feature => ({
  ...baseFeature,
  uuid: `test-${baseFeature.id}`,
  status: 'active',
  last_seen: '2026-01-01T00:00:00.000Z',
});

/** Computed feature: dataset_analysis */
const datasetAnalysis = ({
  streamName,
  fields,
  total,
}: {
  streamName: string;
  fields: Record<string, string[]>;
  total: number;
}): Feature =>
  feature({
    stream_name: streamName,
    id: 'dataset_analysis',
    type: 'dataset_analysis',
    description: 'Automated analysis of the dataset schema and field distributions',
    properties: { analysis: { total, sampled: Math.min(total, 50), fields } },
    confidence: 100,
  });

/** Computed feature: log_samples */
const logSamples = ({
  streamName,
  samples,
}: {
  streamName: string;
  samples: Array<Record<string, unknown>>;
}): Feature =>
  feature({
    stream_name: streamName,
    id: 'log_samples',
    type: 'log_samples',
    description: 'Representative sample of raw log entries',
    properties: { samples },
    confidence: 100,
  });

/** Computed feature: log_patterns */
const logPatterns = ({
  patterns,
}: {
  patterns: Array<{
    pattern: string;
    regex: string;
    count: number;
    sample: string;
    field: string;
  }>;
}): AdditionalFeature => ({
  id: 'log_patterns',
  type: 'log_patterns',
  description: 'Common log message patterns and their frequencies',
  properties: { patterns },
  confidence: 100,
});

/** Computed feature: error_logs */
const errorLogs = ({
  samples,
}: {
  samples: Array<Record<string, unknown>>;
}): AdditionalFeature => ({
  id: 'error_logs',
  type: 'error_logs',
  description: 'Sample of log entries containing errors or exceptions',
  properties: { samples },
  confidence: 100,
});

/**
 * Builds the computed features (dataset_analysis + log_samples) that are
 * mechanically derivable from the raw sample logs, avoiding string duplication
 * in test datasets.
 */
const computedFeaturesFromLogs = ({
  streamName,
  sampleLogs,
  ingestMode,
}: {
  streamName: string;
  sampleLogs: string[];
  ingestMode?: 'single_doc' | 'multi_doc';
}): Feature[] => {
  const messages = ingestMode === 'single_doc' ? [sampleLogs.join('\n')] : sampleLogs;
  const unique = [...new Set(messages)].slice(0, 5);

  return [
    datasetAnalysis({
      streamName,
      fields: { message: unique, '@timestamp': ['2026-02-10T12:00:00.000Z'] },
      total: messages.length,
    }),
    logSamples({
      streamName,
      samples: unique.map((msg) => ({ message: msg })),
    }),
  ];
};

/**
 * Convenience wrapper that builds a full example input, automatically prepending
 * the computed features (dataset_analysis + log_samples) derived from `sample_logs`.
 *
 * `additionalFeatures` should contain only the manually authored features
 * (log_patterns, error_logs, inferred features, etc.).
 */
const buildInput = ({
  additionalFeatures = [],
  ...baseInput
}: Omit<SignificantEventsEvaluationExample['input'], 'features'> & {
  additionalFeatures?: AdditionalFeature[];
}): SignificantEventsEvaluationExample['input'] => ({
  ...baseInput,
  features: [
    ...computedFeaturesFromLogs({
      streamName: baseInput.stream_name,
      sampleLogs: baseInput.sample_logs,
      ingestMode: baseInput.ingest_mode,
    }),
    ...additionalFeatures.map((f) => feature({ ...f, stream_name: baseInput.stream_name })),
  ],
});

/**
 * Datasets for significant events evaluation.
 */
export const SIGNIFICANT_EVENTS_DATASETS: SignificantEventsEvaluationDataset[] = [
  {
    name: 'Synthetic Scenarios (Synthtrace)',
    description:
      'Scenarios that force specific events to appear in logs to test "Ground Truth" detection.',
    examples: [
      {
        input: buildInput({
          stream_name: 'synthtrace.security',
          stream_description: 'A stream with a high number of failed password attempts.',
          sample_logs: Array(50).fill(
            'Jun 14 15:16:02 server sshd[20954]: Failed password for invalid user admin from 192.168.1.100 port 54321'
          ),
          additionalFeatures: [
            logPatterns({
              patterns: [
                {
                  pattern: '* server sshd[*]: Failed password for invalid user * from * port *',
                  regex:
                    '.+ server sshd\\[\\d+\\]: Failed password for invalid user .+ from .+ port \\d+',
                  count: 50,
                  sample:
                    'Jun 14 15:16:02 server sshd[20954]: Failed password for invalid user admin from 192.168.1.100 port 54321',
                  field: 'message',
                },
              ],
            }),
            {
              id: 'openssh-sshd',
              type: 'technology',
              subtype: 'service',
              title: 'OpenSSH Server (sshd)',
              description:
                'OpenSSH daemon providing secure remote login and file transfer via the SSH protocol.',
              properties: { service: 'openssh', component: 'sshd' },
              confidence: 95,
              evidence: [
                'sshd[20954]: Failed password for invalid user admin from 192.168.1.100 port 54321',
              ],
              tags: ['security', 'authentication'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['security'],
            kql_substrings: ['Failed password'],
          },
          criteria: [
            {
              id: 'ssh_detection',
              text: 'At least one query specifically targets SSH authentication failures (e.g., "Failed password" pattern)',
              score: 1.5,
            },
            {
              id: 'security_category',
              text: 'The query for failed passwords should be categorized as "security" with severity >= 70, reflecting the brute-force attack risk',
              score: 1,
            },
            {
              id: 'no_irrelevant_categories',
              text: 'Should not generate "operational" or "configuration" queries for this security-focused dataset',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Scenario A (Security): Inject 50+ "Failed password" logs.',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.operational',
          stream_description: 'A stream with service start and stop events.',
          sample_logs: [
            'Jan 15 10:30:45 server01 systemd[1]: Started Session 123 of user root.',
            'Jan 15 10:30:52 server01 systemd[1]: Stopping System Logging Service...',
          ],
          additionalFeatures: [
            logPatterns({
              patterns: [
                {
                  pattern: '* server01 systemd[1]: Started *',
                  regex: '.+ server01 systemd\\[1\\]: Started .+',
                  count: 1,
                  sample: 'Jan 15 10:30:45 server01 systemd[1]: Started Session 123 of user root.',
                  field: 'message',
                },
                {
                  pattern: '* server01 systemd[1]: Stopping *',
                  regex: '.+ server01 systemd\\[1\\]: Stopping .+',
                  count: 1,
                  sample: 'Jan 15 10:30:52 server01 systemd[1]: Stopping System Logging Service...',
                  field: 'message',
                },
              ],
            }),
            {
              id: 'systemd-init',
              type: 'technology',
              subtype: 'service',
              title: 'systemd',
              description:
                'Linux init system and service manager responsible for bootstrapping and managing system services.',
              properties: { service: 'systemd', component: 'init' },
              confidence: 95,
              evidence: [
                'systemd[1]: Started Session 123 of user root.',
                'systemd[1]: Stopping System Logging Service...',
              ],
              tags: ['operational', 'linux'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['operational'],
            kql_substrings: [['Started', 'Stopping']],
          },
          criteria: [
            {
              id: 'lifecycle_detection',
              text: 'Queries should capture service lifecycle events (start/stop) from systemd',
              score: 1.5,
            },
            {
              id: 'operational_category',
              text: 'These should be categorized as "operational" with low-to-medium severity (0-50), since service start/stop is routine',
              score: 1,
            },
          ],
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Scenario B (Operational): Inject "Service started" and "Service stopped" logs.',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.java_error',
          stream_description: 'A stream with multiline Java stack traces.',
          sample_logs: [
            '23/01/15 10:30:47 ERROR Executor: Exception in task 2.0 in stage 0.0 (TID 2)',
            'java.lang.NullPointerException: Attempt to invoke virtual method on a null object reference',
            '    at com.example.myproject.MyClass.myMethod(MyClass.java:123)',
            '    at com.example.myproject.AnotherClass.anotherMethod(AnotherClass.java:456)',
          ],
          ingest_mode: 'single_doc',
          additionalFeatures: [
            errorLogs({
              samples: [
                {
                  message:
                    '23/01/15 10:30:47 ERROR Executor: Exception in task 2.0 in stage 0.0 (TID 2)\njava.lang.NullPointerException: Attempt to invoke virtual method on a null object reference\n    at com.example.myproject.MyClass.myMethod(MyClass.java:123)\n    at com.example.myproject.AnotherClass.anotherMethod(AnotherClass.java:456)',
                },
              ],
            }),
            {
              id: 'java',
              type: 'technology',
              subtype: 'programming_language',
              title: 'Java',
              description:
                'General-purpose, class-based, object-oriented programming language and runtime environment.',
              properties: { language: 'java' },
              confidence: 95,
              evidence: [
                'java.lang.NullPointerException: Attempt to invoke virtual method on a null object reference',
                'at com.example.myproject.MyClass.myMethod(MyClass.java:123)',
              ],
              tags: ['error', 'java'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: ['error', 'java.lang.NullPointerException'],
          },
          criteria: [
            {
              id: 'npe_detection',
              text: 'At least one query targets the specific Java NullPointerException observed in the stack trace',
              score: 1.5,
            },
            {
              id: 'error_severity',
              text: 'Should be categorized as "error" with high severity (>= 60), reflecting an application crash',
              score: 1,
            },
            {
              id: 'java_specific',
              text: 'Query should reference Java-specific exception patterns rather than generic error terms',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Scenario C (Java Error): Inject multiline Java stack traces (NullPointerException).',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.http_5xx_errors',
          stream_description: 'A stream with a high number of HTTP 5xx errors.',
          sample_logs: [
            ...Array(20).fill(
              '192.168.1.1 - - [15/Jan/2024:10:30:00 +0000] "GET /api/user HTTP/1.1" 503 1234 "-" "Mozilla/5.0"'
            ),
            ...Array(15).fill(
              '10.0.0.5 - - [15/Jan/2024:10:31:12 +0000] "POST /api/checkout HTTP/1.1" 500 892 "-" "Mozilla/5.0"'
            ),
            ...Array(10).fill(
              '172.16.0.3 - - [15/Jan/2024:10:32:45 +0000] "GET /api/products HTTP/1.1" 502 456 "-" "Mozilla/5.0"'
            ),
            ...Array(5).fill(
              '192.168.1.10 - - [15/Jan/2024:10:33:20 +0000] "PUT /api/settings HTTP/1.1" 504 0 "-" "Mozilla/5.0"'
            ),
          ],
          additionalFeatures: [
            logPatterns({
              patterns: [
                {
                  pattern: '* - - [*] "* HTTP/1.1" 503 * "-" "*"',
                  regex: '.+ - - \\[.+\\] ".+ HTTP/1\\.1" 503 \\d+ "-" ".+"',
                  count: 20,
                  sample:
                    '192.168.1.1 - - [15/Jan/2024:10:30:00 +0000] "GET /api/user HTTP/1.1" 503 1234 "-" "Mozilla/5.0"',
                  field: 'message',
                },
                {
                  pattern: '* - - [*] "* HTTP/1.1" 500 * "-" "*"',
                  regex: '.+ - - \\[.+\\] ".+ HTTP/1\\.1" 500 \\d+ "-" ".+"',
                  count: 15,
                  sample:
                    '10.0.0.5 - - [15/Jan/2024:10:31:12 +0000] "POST /api/checkout HTTP/1.1" 500 892 "-" "Mozilla/5.0"',
                  field: 'message',
                },
                {
                  pattern: '* - - [*] "* HTTP/1.1" 502 * "-" "*"',
                  regex: '.+ - - \\[.+\\] ".+ HTTP/1\\.1" 502 \\d+ "-" ".+"',
                  count: 10,
                  sample:
                    '172.16.0.3 - - [15/Jan/2024:10:32:45 +0000] "GET /api/products HTTP/1.1" 502 456 "-" "Mozilla/5.0"',
                  field: 'message',
                },
                {
                  pattern: '* - - [*] "* HTTP/1.1" 504 * "-" "*"',
                  regex: '.+ - - \\[.+\\] ".+ HTTP/1\\.1" 504 \\d+ "-" ".+"',
                  count: 5,
                  sample:
                    '192.168.1.10 - - [15/Jan/2024:10:33:20 +0000] "PUT /api/settings HTTP/1.1" 504 0 "-" "Mozilla/5.0"',
                  field: 'message',
                },
              ],
            }),
            {
              id: 'http-web-server',
              type: 'technology',
              subtype: 'web_server',
              title: 'HTTP Web Server',
              description:
                'HTTP web server handling client requests and producing access logs in combined log format.',
              properties: { format: 'combined_log' },
              confidence: 90,
              evidence: [
                '"GET /api/user HTTP/1.1" 503 1234',
                '"POST /api/checkout HTTP/1.1" 500 892',
                '"GET /api/products HTTP/1.1" 502 456',
              ],
              tags: ['web', 'http'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: [['500', '502', '503', '504']],
          },
          criteria: [
            {
              id: 'http_5xx_detection',
              text: 'At least one query captures HTTP 5xx server errors from the access log patterns. The query should target one or more of the status codes (500, 502, 503, 504) visible in the raw log messages.',
              score: 1.5,
            },
            {
              id: 'error_category',
              text: 'Should be categorized as "error" since 5xx codes indicate server-side failures',
              score: 1,
            },
            {
              id: 'unavailability_severity',
              text: 'Severity should reflect that repeated 5xx errors indicate server-side failures and potential service unavailability (>= 60)',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Scenario D (HTTP Errors): Inject raw access logs with a mix of 5xx status codes (500, 502, 503, 504). Since data is ingested as raw text (message field only), queries should use string matching on the status code patterns.',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.python_error',
          stream_description: 'A stream with Python IndexError stack traces.',
          sample_logs: [
            'Traceback (most recent call last):',
            '  File "main.py", line 10, in <module>',
            '    print(my_list[5])',
            'IndexError: list index out of range',
          ],
          ingest_mode: 'single_doc',
          additionalFeatures: [
            errorLogs({
              samples: [
                {
                  message:
                    'Traceback (most recent call last):\n  File "main.py", line 10, in <module>\n    print(my_list[5])\nIndexError: list index out of range',
                },
              ],
            }),
            {
              id: 'python',
              type: 'technology',
              subtype: 'programming_language',
              title: 'Python',
              description:
                'High-level, interpreted programming language used for general-purpose software development.',
              properties: { language: 'python' },
              confidence: 95,
              evidence: [
                'Traceback (most recent call last):',
                'IndexError: list index out of range',
              ],
              tags: ['error', 'python'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: ['error', 'IndexError'],
          },
          criteria: [
            {
              id: 'python_error_detection',
              text: 'At least one query targets the Python IndexError or Traceback pattern',
              score: 1.5,
            },
            {
              id: 'error_severity',
              text: 'Should be categorized as "error" with medium-to-high severity',
              score: 1,
            },
            {
              id: 'python_specific',
              text: 'Query should reference Python-specific exception patterns (e.g., IndexError, Traceback) rather than just generic error terms',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Scenario E (Python Error): Inject multiline Python stack traces (IndexError).',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.docker_error',
          stream_description: 'A stream with Docker image not found errors.',
          sample_logs: [
            "Unable to find image 'nonexistent-image:latest' locally",
            "docker: Error response from daemon: pull access denied for nonexistent-image, repository does not exist or may require 'docker login'.",
          ],
          additionalFeatures: [
            errorLogs({
              samples: [
                {
                  message:
                    "docker: Error response from daemon: pull access denied for nonexistent-image, repository does not exist or may require 'docker login'.",
                },
              ],
            }),
            {
              id: 'docker-runtime',
              type: 'technology',
              subtype: 'container_runtime',
              title: 'Docker',
              description:
                'Container runtime for building, shipping, and running applications in isolated environments.',
              properties: { runtime: 'docker' },
              confidence: 95,
              evidence: [
                "Unable to find image 'nonexistent-image:latest' locally",
                'docker: Error response from daemon: pull access denied',
              ],
              tags: ['container', 'docker'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: [
              ['error', 'Error'],
              'image',
              ['not found', 'Unable to find', 'pull access denied'],
            ],
          },
          criteria: [
            {
              id: 'docker_error_detection',
              text: 'At least one query targets Docker image pull failures or image-not-found errors',
              score: 1.5,
            },
            {
              id: 'error_category',
              text: 'Should be categorized as "error" since a missing image prevents container startup',
              score: 1,
            },
            {
              id: 'docker_specific',
              text: 'Query should reference Docker-specific terms (e.g., "pull access denied", "image", "daemon") not just generic errors',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Scenario F (Docker Error): Inject Docker image not found errors.',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.k8s_error',
          stream_description: 'A stream with Kubernetes pod CrashLoopBackOff errors.',
          sample_logs: [
            'State:          Waiting',
            '  Reason:       CrashLoopBackOff',
            'Last State:     Terminated',
            '  Reason:       Error',
            '  Exit Code:    1',
          ],
          additionalFeatures: [
            errorLogs({
              samples: [
                { message: '  Reason:       CrashLoopBackOff' },
                { message: '  Reason:       Error' },
              ],
            }),
            {
              id: 'kubernetes',
              type: 'infrastructure',
              subtype: 'container_orchestration',
              title: 'Kubernetes',
              description:
                'Open-source container orchestration platform for automating deployment, scaling, and management of containerized applications.',
              properties: { orchestrator: 'kubernetes' },
              confidence: 90,
              evidence: [
                'Reason:       CrashLoopBackOff',
                'Last State:     Terminated',
                'Exit Code:    1',
              ],
              tags: ['kubernetes', 'container'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: ['error', 'CrashLoopBackOff'],
          },
          criteria: [
            {
              id: 'crashloop_detection',
              text: 'At least one query targets the Kubernetes CrashLoopBackOff state',
              score: 1.5,
            },
            {
              id: 'error_high_severity',
              text: 'Should be categorized as "error" with high severity (>= 70), since CrashLoopBackOff indicates a pod is repeatedly crashing',
              score: 1,
            },
            {
              id: 'k8s_specific',
              text: 'Query should reference Kubernetes-specific terms (e.g., CrashLoopBackOff, Terminated, Exit Code) rather than generic error patterns',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'hard',
          notes: 'Scenario G (Kubernetes Error): Inject Kubernetes CrashLoopBackOff events.',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.db_connection_error',
          stream_description: 'A stream with database connection errors.',
          sample_logs: [
            'ERROR: could not connect to database "postgres": Connection refused',
            'Is the server running on host "db.example.com" (192.168.1.10) and accepting TCP/IP connections on port 5432?',
          ],
          additionalFeatures: [
            errorLogs({
              samples: [
                {
                  message: 'ERROR: could not connect to database "postgres": Connection refused',
                },
              ],
            }),
            {
              id: 'postgresql',
              type: 'technology',
              subtype: 'database',
              title: 'PostgreSQL',
              description:
                'Open-source relational database management system with SQL compliance and extensibility.',
              properties: { database: 'postgresql', port: 5432 },
              confidence: 95,
              evidence: [
                'could not connect to database "postgres": Connection refused',
                'accepting TCP/IP connections on port 5432',
              ],
              tags: ['database', 'postgresql'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: ['error', 'connect', 'database'],
          },
          criteria: [
            {
              id: 'db_connection_detection',
              text: 'At least one query targets PostgreSQL connection failures (e.g., "Connection refused" or "could not connect")',
              score: 1.5,
            },
            {
              id: 'error_high_severity',
              text: 'Should be categorized as "error" with high severity, since database connectivity loss typically causes service outages',
              score: 1,
            },
            {
              id: 'db_specific',
              text: 'Query should reference database-specific connection error patterns, not just the generic word "error"',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Scenario H (Database Error): Inject database connection refused errors.',
        },
      },
      {
        input: buildInput({
          stream_name: 'synthtrace.disk_space_warning',
          stream_description: 'A stream with disk space warnings.',
          sample_logs: [
            'WARN: /var/log is 95% full',
            'CRITICAL: /var/log is 99% full. Please free up space immediately.',
          ],
          additionalFeatures: [
            logPatterns({
              patterns: [
                {
                  pattern: 'WARN: * is *% full',
                  regex: 'WARN: .+ is \\d+% full',
                  count: 1,
                  sample: 'WARN: /var/log is 95% full',
                  field: 'message',
                },
                {
                  pattern: 'CRITICAL: * is *% full. *',
                  regex: 'CRITICAL: .+ is \\d+% full\\. .+',
                  count: 1,
                  sample: 'CRITICAL: /var/log is 99% full. Please free up space immediately.',
                  field: 'message',
                },
              ],
            }),
            {
              id: 'disk-monitoring',
              type: 'infrastructure',
              subtype: 'monitoring',
              title: 'Disk Space Monitoring',
              description:
                'System-level disk usage monitoring that tracks filesystem capacity across partitions.',
              properties: { monitored_path: '/var/log' },
              confidence: 90,
              evidence: ['WARN: /var/log is 95% full', 'CRITICAL: /var/log is 99% full'],
              tags: ['infrastructure', 'disk', 'monitoring'],
              meta: {},
            },
          ],
        }),
        output: {
          expected_query: {
            categories: ['resource_health'],
            kql_substrings: [['warn', 'critical'], 'full'],
          },
          criteria: [
            {
              id: 'disk_space_detection',
              text: 'At least one query targets disk space warnings or critical alerts (e.g., "full", "WARN", "CRITICAL")',
              score: 1.5,
            },
            {
              id: 'resource_health_category',
              text: 'Should be categorized as "resource_health" since this represents infrastructure capacity issues',
              score: 1,
            },
            {
              id: 'severity_escalation',
              text: 'Severity should reflect escalation: CRITICAL disk full (>= 70) is more severe than WARN (40-60)',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Scenario I (Disk Space): Inject disk space warnings and critical alerts.',
        },
      },
    ],
  },
  {
    name: 'Real-World Datasets',
    description: 'Reusing datasets from pattern extraction for broader testing.',
    examples: [
      {
        input: (() => {
          const sampleLogs =
            GROK_PATTERN_DATASETS.web_servers.examples.find(
              (ex) => ex.input.stream_name === 'logs.nginx'
            )?.input.sample_messages || [];
          return buildInput({
            stream_name: 'logs.nginx',
            stream_description: 'Nginx access logs, potentially containing 4xx and 5xx errors.',
            sample_logs: sampleLogs,
            additionalFeatures: [
              logPatterns({
                patterns: [
                  {
                    pattern: '* - - [*] "* HTTP/1.1" * * "-" "*"',
                    regex: '.+ - - \\[.+\\] ".+ HTTP/1\\.1" \\d+ \\d+ "-" ".+"',
                    count: sampleLogs.length,
                    sample: sampleLogs[0] ?? '',
                    field: 'message',
                  },
                ],
              }),
              {
                id: 'nginx-web-server',
                type: 'technology',
                subtype: 'web_server',
                title: 'Nginx',
                description:
                  'High-performance HTTP server and reverse proxy commonly used for web serving and load balancing.',
                properties: { server: 'nginx', format: 'combined_log' },
                confidence: 95,
                evidence: sampleLogs.slice(0, 2),
                tags: ['web', 'nginx'],
                meta: {},
              },
            ],
          });
        })(),
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: [
              ['4??', '4*', '400', '403', '404'],
              ['5??', '5*', '500', '502', '503'],
            ],
          },
          criteria: [
            {
              id: 'nginx_error_detection',
              text: 'At least one query targets HTTP 4xx client errors and/or 5xx server errors in Nginx access logs',
              score: 1.5,
            },
            {
              id: 'status_code_filtering',
              text: 'Queries should use HTTP status code filtering appropriate for web server monitoring',
              score: 1,
            },
            {
              id: 'error_category',
              text: 'Should be categorized as "error" since 4xx/5xx status codes represent failed requests',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Nginx logs should probably result in a query filtering for 5xx or 4xx status codes.',
        },
      },
      {
        input: (() => {
          const sampleLogs =
            GROK_PATTERN_DATASETS.system_logs.examples.find(
              (ex) => ex.input.stream_name === 'logs.syslog'
            )?.input.sample_messages || [];
          return buildInput({
            stream_name: 'logs.syslog',
            stream_description: 'Linux syslog, a mix of operational and system messages.',
            sample_logs: sampleLogs,
            additionalFeatures: [
              {
                id: 'linux-syslog',
                type: 'infrastructure',
                subtype: 'operating_system',
                title: 'Linux Syslog',
                description:
                  'Standard Linux system logging facility aggregating messages from the kernel and system services.',
                properties: { os: 'linux', log_facility: 'syslog' },
                confidence: 90,
                evidence: sampleLogs.slice(0, 2),
                tags: ['linux', 'syslog'],
                meta: {},
              },
            ],
          });
        })(),
        output: {
          expected_query: {
            categories: ['operational'],
            kql_substrings: [['error', 'fail', 'Out of memory', 'Kill process']],
          },
          criteria: [
            {
              id: 'syslog_event_detection',
              text: 'Queries should target operational events typical of Linux syslog (e.g., errors, service failures, authentication events)',
              score: 1.5,
            },
            {
              id: 'operational_category',
              text: 'Should be categorized as "operational" given the general system-level nature of syslog messages',
              score: 1,
            },
            {
              id: 'no_hallucinated_tech',
              text: 'Should not generate highly specialized queries for technologies not present in the log data',
              score: 0.5,
            },
          ],
        },
        metadata: {
          difficulty: 'easy',
          notes: 'General syslog messages.',
        },
      },
    ],
  },
];
