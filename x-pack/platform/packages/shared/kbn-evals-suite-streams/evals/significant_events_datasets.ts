/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROK_PATTERN_DATASETS } from './pattern_extraction_datasets';

/**
 * Ground truth data for significant events evaluation.
 */
export interface SignificantEventsGroundTruth {
  // Expected query properties
  expected_query: {
    // Categories of queries we expect to see (e.g., 'security', 'operational')
    categories: string[];
    // Specific KQL substrings that should be present in the generated query
    kql_substrings?: string[];
  };
}

export interface SignificantEventsEvaluationExample {
  input: {
    stream_name: string;
    // A description of the stream's features (e.g., 'Nginx access logs with 5xx errors')
    feature_description: string;
    // Sample log messages that characterize the stream
    sample_logs: string[];
    // How to ingest the sample logs
    ingest_mode?: 'single_doc' | 'multi_doc';
  };
  output: SignificantEventsGroundTruth;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
  };
}

export interface SignificantEventsEvaluationDataset {
  name: string;
  description: string;
  examples: SignificantEventsEvaluationExample[];
}

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
        input: {
          stream_name: 'synthtrace.security',
          feature_description: 'A stream with a high number of failed password attempts.',
          sample_logs: Array(50).fill(
            'Jun 14 15:16:02 server sshd[20954]: Failed password for invalid user admin from 192.168.1.100 port 54321'
          ),
        },
        output: {
          expected_query: {
            categories: ['security'],
            kql_substrings: ['"Failed password"'],
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Scenario A (Security): Inject 50+ "Failed password" logs.',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.operational',
          feature_description: 'A stream with service start and stop events.',
          sample_logs: [
            'Jan 15 10:30:45 server01 systemd[1]: Started Session 123 of user root.',
            'Jan 15 10:30:52 server01 systemd[1]: Stopping System Logging Service...',
          ],
        },
        output: {
          expected_query: {
            categories: ['operational'],
            kql_substrings: ['"Started" or "Stopping"'],
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Scenario B (Operational): Inject "Service started" and "Service stopped" logs.',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.java_error',
          feature_description: 'A stream with multiline Java stack traces.',
          sample_logs: [
            '23/01/15 10:30:47 ERROR Executor: Exception in task 2.0 in stage 0.0 (TID 2)',
            'java.lang.NullPointerException: Attempt to invoke virtual method on a null object reference',
            '    at com.example.myproject.MyClass.myMethod(MyClass.java:123)',
            '    at com.example.myproject.AnotherClass.anotherMethod(AnotherClass.java:456)',
          ],
          ingest_mode: 'single_doc',
        },
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: ['error', 'java.lang.NullPointerException'],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Scenario C (Java Error): Inject multiline Java stack traces (NullPointerException).',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.http_5xx_errors',
          feature_description: 'A stream with a high number of HTTP 5xx errors.',
          sample_logs: Array(50).fill(
            '192.168.1.1 - - [15/Jan/2024:10:30:00 +0000] "GET /api/user HTTP/1.1" 503 1234 "-" "Mozilla/5.0"'
          ),
        },
        output: {
          expected_query: {
            categories: ['error', 'web'],
            kql_substrings: [
              'http.response.status_code >= 500 and http.response.status_code < 600',
            ],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Scenario D (HTTP Errors): Inject logs with 5xx status codes to test range queries.',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.python_error',
          feature_description: 'A stream with Python IndexError stack traces.',
          sample_logs: [
            'Traceback (most recent call last):',
            '  File "main.py", line 10, in <module>',
            '    print(my_list[5])',
            'IndexError: list index out of range',
          ],
          ingest_mode: 'single_doc',
        },
        output: {
          expected_query: {
            categories: ['error'],
            kql_substrings: ['error', 'IndexError'],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Scenario E (Python Error): Inject multiline Python stack traces (IndexError).',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.docker_error',
          feature_description: 'A stream with Docker image not found errors.',
          sample_logs: [
            "Unable to find image 'nonexistent-image:latest' locally",
            "docker: Error response from daemon: pull access denied for nonexistent-image, repository does not exist or may require 'docker login'.",
          ],
        },
        output: {
          expected_query: {
            categories: ['error', 'devops'],
            kql_substrings: ['error', 'image', 'not found'],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Scenario F (Docker Error): Inject Docker image not found errors.',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.k8s_error',
          feature_description: 'A stream with Kubernetes pod CrashLoopBackOff errors.',
          sample_logs: [
            'State:          Waiting',
            '  Reason:       CrashLoopBackOff',
            'Last State:     Terminated',
            '  Reason:       Error',
            '  Exit Code:    1',
          ],
        },
        output: {
          expected_query: {
            categories: ['error', 'devops'],
            kql_substrings: ['error', 'CrashLoopBackOff'],
          },
        },
        metadata: {
          difficulty: 'hard',
          notes: 'Scenario G (Kubernetes Error): Inject Kubernetes CrashLoopBackOff events.',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.db_connection_error',
          feature_description: 'A stream with database connection errors.',
          sample_logs: [
            'ERROR: could not connect to database "postgres": Connection refused',
            'Is the server running on host "db.example.com" (192.168.1.10) and accepting TCP/IP connections on port 5432?',
          ],
        },
        output: {
          expected_query: {
            categories: ['error', 'database'],
            kql_substrings: ['error', 'connect', 'database'],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Scenario H (Database Error): Inject database connection refused errors.',
        },
      },
      {
        input: {
          stream_name: 'synthtrace.disk_space_warning',
          feature_description: 'A stream with disk space warnings.',
          sample_logs: [
            'WARN: /var/log is 95% full',
            'CRITICAL: /var/log is 99% full. Please free up space immediately.',
          ],
        },
        output: {
          expected_query: {
            categories: ['operational', 'system'],
            kql_substrings: ['warn or critical', 'full'],
          },
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
        input: {
          stream_name: 'logs.nginx',
          feature_description: 'Nginx access logs, potentially containing 4xx and 5xx errors.',
          sample_logs:
            GROK_PATTERN_DATASETS.web_servers.examples.find(
              (ex) => ex.input.stream_name === 'logs.nginx'
            )?.input.sample_messages || [],
        },
        output: {
          expected_query: {
            categories: ['operational', 'web'],
            kql_substrings: ['4??', '5??'],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Nginx logs should probably result in a query filtering for 5xx or 4xx status codes.',
        },
      },
      {
        input: {
          stream_name: 'logs.syslog',
          feature_description: 'Linux syslog, a mix of operational and system messages.',
          sample_logs:
            GROK_PATTERN_DATASETS.system_logs.examples.find(
              (ex) => ex.input.stream_name === 'logs.syslog'
            )?.input.sample_messages || [],
        },
        output: {
          expected_query: {
            categories: ['operational', 'system'],
            kql_substrings: ['error or fail*'],
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'General syslog messages.',
        },
      },
    ],
  },
];
