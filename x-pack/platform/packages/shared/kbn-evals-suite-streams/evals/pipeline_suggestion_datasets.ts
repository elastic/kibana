/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ground truth data for pipeline suggestion evaluation.
 *
 * Each example represents expectations for a single LogHub system's pipeline generation.
 */

export interface PipelineSuggestionGroundTruth {
  // Metadata
  source_id: string;
  system: string; // LogHub system name (e.g., 'Apache', 'Zookeeper')

  // Expected processors
  expected_processors: {
    parsing?: {
      type: 'grok' | 'dissect';
      should_parse_field: string; // Usually 'body.text'
      expected_fields: string[]; // Fields that should be extracted
    };
    normalization?: Array<{
      type: 'date' | 'rename' | 'convert' | 'remove';
      description: string;
      target_field?: string;
    }>;
  };

  // Quality thresholds
  quality_thresholds: {
    min_parse_rate: number; // e.g., 0.8 (80%)
    min_field_count: number;
    max_field_count: number;
    required_semantic_fields: string[]; // e.g., ['@timestamp', 'log.level']
  };

  // Schema expectations
  schema_expectations: {
    expected_schema_fields: string[]; // OTel field names expected in final output
  };
}

export interface PipelineSuggestionEvaluationExample {
  input: {
    stream_name: string; // e.g., 'logs.apache'
    system: string; // LogHub system to index
    // Two modes supported:
    // 1. Inline mode: Provide sample_documents array (will create child stream with routing)
    // 2. Index mode: Set sample_document_count (will read from existing indices)
    sample_documents?: Array<Record<string, unknown>>; // Inline sample documents for evaluation
    sample_document_count?: number; // Number of documents to fetch from existing stream
  };
  output: PipelineSuggestionGroundTruth;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
  };
}

export interface PipelineSuggestionEvaluationDataset {
  name: string;
  description: string;
  examples: PipelineSuggestionEvaluationExample[];
}

/**
 * Pipeline suggestion datasets for LogHub systems.
 * Each dataset evaluates pipeline generation for a specific log format.
 */
export const PIPELINE_SUGGESTION_DATASETS: PipelineSuggestionEvaluationDataset[] = [
  {
    name: 'Web Server Logs - Pipeline Suggestion',
    description: 'Apache web server error logs',
    examples: [
      // 🔧 NEW DATASETS GO HERE - Added by create_dataset_from_clipboard.ts
      {
        input: {
          stream_name: 'logs.structured',
          system: 'structured',
          // Already-structured data with proper OTel fields - no parsing needed
          sample_documents: [
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              severity_text: 'INFO',
              'body.text': 'Service initialized',
              'resource.attributes.service.name': 'my-app',
            },
            {
              '@timestamp': '2026-01-30T16:36:13.500Z',
              severity_text: 'DEBUG',
              'body.text': 'Configuration loaded',
              'resource.attributes.service.name': 'my-app',
            },
            {
              '@timestamp': '2026-01-30T16:36:14.200Z',
              severity_text: 'WARN',
              'body.text': 'Slow response detected',
              'resource.attributes.service.name': 'my-app',
            },
            {
              '@timestamp': '2026-01-30T16:36:15.100Z',
              severity_text: 'ERROR',
              'body.text': 'Connection failed',
              'resource.attributes.service.name': 'my-app',
            },
            {
              '@timestamp': '2026-01-30T16:36:16.800Z',
              severity_text: 'INFO',
              'body.text': 'Request complete',
              'resource.attributes.service.name': 'my-app',
            },
          ],
        },
        output: {
          source_id: 'structured-logs-2026-01-30',
          system: 'structured',
          expected_processors: {
            // No pipeline expected - the data is already structured with proper OTel fields
            parsing: undefined,
            normalization: [],
          },
          quality_thresholds: {
            min_parse_rate: 0,
            min_field_count: 0,
            max_field_count: 0,
            required_semantic_fields: [],
          },
          schema_expectations: {
            expected_schema_fields: [],
          },
        },
        metadata: {
          difficulty: 'easy' as const,
          notes:
            'Tests that the LLM correctly identifies when no pipeline is needed. Data already has @timestamp, severity_text, body.text - no parsing required.',
        },
      },
      // 🔧 NEW DATASETS GO HERE - Added by create_dataset_from_clipboard.ts
      {
        input: {
          stream_name: 'logs.apache',
          system: 'Apache',
          sample_document_count: 100,
        },
        output: {
          source_id: 'apache-error',
          system: 'Apache',
          expected_processors: {
            parsing: {
              type: 'grok',
              should_parse_field: 'body.text',
              expected_fields: ['custom.timestamp', 'severity_text', 'body.text'],
            },
            normalization: [
              {
                type: 'date',
                target_field: '@timestamp',
                description: 'Parse Apache timestamp to @timestamp',
              },
              {
                type: 'remove',
                target_field: 'custom.timestamp',
                description: 'Remove temporary timestamp field',
              },
            ],
          },
          quality_thresholds: {
            min_parse_rate: 0.85,
            min_field_count: 3,
            max_field_count: 8,
            required_semantic_fields: ['@timestamp', 'severity_text'],
          },
          schema_expectations: {
            expected_schema_fields: [
              '@timestamp',
              'body.text',
              'severity_text',
              'resource.attributes.host.name',
              'resource.attributes.process.name',
              'resource.attributes.process.pid',
              'attributes.user.name',
              'attributes.process.name',
            ],
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Apache error logs with severity and message',
        },
      },
    ],
  },
  {
    name: 'Authentication Logs - Pipeline Suggestion',
    description: 'OpenSSH authentication logs in syslog format',
    examples: [
      {
        input: {
          stream_name: 'logs.openssh',
          system: 'OpenSSH',
          sample_document_count: 100,
        },
        output: {
          source_id: 'openssh-auth',
          system: 'OpenSSH',
          expected_processors: {
            parsing: {
              type: 'grok',
              should_parse_field: 'body.text',
              expected_fields: [
                'custom.timestamp',
                'resource.attributes.host.name',
                'resource.attributes.process.name',
                'resource.attributes.process.pid',
                'body.text',
              ],
            },
            normalization: [
              {
                type: 'date',
                target_field: '@timestamp',
                description: 'Parse syslog timestamp to @timestamp',
              },
              {
                type: 'convert',
                target_field: 'attributes.process.pid',
                description: 'Convert PID to long',
              },
              {
                type: 'remove',
                target_field: 'custom.timestamp',
                description: 'Remove temporary timestamp field',
              },
            ],
          },
          quality_thresholds: {
            min_parse_rate: 0.85,
            min_field_count: 4,
            max_field_count: 10,
            required_semantic_fields: [
              '@timestamp',
              'resource.attributes.host.name',
              'resource.attributes.process.name',
            ],
          },
          schema_expectations: {
            expected_schema_fields: [
              '@timestamp',
              'body.text',
              'resource.attributes.host.name',
              'resource.attributes.process.name',
              'resource.attributes.process.pid',
              'attributes.user.name',
            ],
          },
        },
        metadata: {
          difficulty: 'easy',
          notes: 'Standard syslog format',
        },
      },
    ],
  },
  {
    name: 'Big Data System Logs - Pipeline Suggestion',
    description: 'Zookeeper distributed coordination service logs',
    examples: [
      {
        input: {
          stream_name: 'logs.zookeeper',
          system: 'Zookeeper',
          sample_document_count: 100,
        },
        output: {
          source_id: 'zookeeper',
          system: 'Zookeeper',
          expected_processors: {
            parsing: {
              type: 'grok',
              should_parse_field: 'body.text',
              expected_fields: ['custom.timestamp', 'severity_text', 'body.text'],
            },
            normalization: [
              {
                type: 'date',
                target_field: '@timestamp',
                description: 'Parse Zookeeper timestamp to @timestamp',
              },
              {
                type: 'remove',
                target_field: 'custom.timestamp',
                description: 'Remove temporary timestamp field',
              },
            ],
          },
          quality_thresholds: {
            min_parse_rate: 0.85,
            min_field_count: 3,
            max_field_count: 8,
            required_semantic_fields: ['@timestamp', 'severity_text'],
          },
          schema_expectations: {
            expected_schema_fields: [
              '@timestamp',
              'body.text',
              'severity_text',
              'resource.attributes.host.name',
              'resource.attributes.process.name',
              'resource.attributes.process.pid',
              'resource.attributes.k8s.pod.name',
              'attributes.user.name',
            ],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Java application logs with thread information',
        },
      },
    ],
  },
  {
    name: 'Distributed File System Logs - Pipeline Suggestion',
    description: 'HDFS (Hadoop Distributed File System) logs',
    examples: [
      {
        input: {
          stream_name: 'logs.hdfs',
          system: 'HDFS',
          sample_document_count: 100,
        },
        output: {
          source_id: 'hdfs',
          system: 'HDFS',
          expected_processors: {
            parsing: {
              type: 'grok',
              should_parse_field: 'body.text',
              expected_fields: ['custom.timestamp', 'severity_text', 'body.text'],
            },
            normalization: [
              {
                type: 'date',
                target_field: '@timestamp',
                description: 'Parse HDFS timestamp to @timestamp',
              },
              {
                type: 'remove',
                target_field: 'custom.timestamp',
                description: 'Remove temporary timestamp field',
              },
            ],
          },
          quality_thresholds: {
            min_parse_rate: 0.8,
            min_field_count: 3,
            max_field_count: 8,
            required_semantic_fields: ['@timestamp', 'severity_text'],
          },
          schema_expectations: {
            expected_schema_fields: [
              '@timestamp',
              'body.text',
              'severity_text',
              'resource.attributes.host.name',
              'resource.attributes.process.name',
              'resource.attributes.process.pid',
              'resource.attributes.k8s.pod.name',
              'attributes.user.name',
            ],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Compact timestamp format with Java class loggers',
        },
      },
    ],
  },
  {
    name: 'Application Analytics Logs - Pipeline Suggestion',
    description: 'Spark distributed computing engine logs',
    examples: [
      {
        input: {
          stream_name: 'logs.spark',
          system: 'Spark',
          sample_document_count: 100,
        },
        output: {
          source_id: 'spark',
          system: 'Spark',
          expected_processors: {
            parsing: {
              type: 'grok',
              should_parse_field: 'body.text',
              expected_fields: [
                'custom.timestamp',
                'severity_text',
                'attributes.log.logger',
                'body.text',
              ],
            },
            normalization: [
              {
                type: 'date',
                target_field: '@timestamp',
                description: 'Parse Spark timestamp to @timestamp',
              },
              {
                type: 'remove',
                target_field: 'custom.timestamp',
                description: 'Remove temporary timestamp field',
              },
            ],
          },
          quality_thresholds: {
            min_parse_rate: 0.85,
            min_field_count: 3,
            max_field_count: 8,
            required_semantic_fields: ['@timestamp', 'severity_text'],
          },
          schema_expectations: {
            expected_schema_fields: [
              '@timestamp',
              'body.text',
              'severity_text',
              'resource.attributes.host.name',
              'resource.attributes.process.name',
              'attributes.user.name',
            ],
          },
        },
        metadata: {
          difficulty: 'medium',
          notes: 'Java/Scala logs with log4j format',
        },
      },
    ],
  },
];
