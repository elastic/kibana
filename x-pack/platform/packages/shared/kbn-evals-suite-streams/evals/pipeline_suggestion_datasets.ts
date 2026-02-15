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
          stream_name: 'logs.unknown',
          system: 'unknown',
          sample_documents: [
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233343',
                },
                project: {
                  id: '1528000009233342',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233340',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233344/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Error with certificate: "ca_trusted_fingerprint"',
              network: {
                bytes: 8118,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233341',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233339',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233349',
                },
                project: {
                  id: '1528000009233348',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233346',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233350/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Emergency! Core system unavailable',
              network: {
                bytes: 8115,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233347',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233345',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233355',
                },
                project: {
                  id: '1528000009233354',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233352',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233356/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'A simple info log with something random <random> in the middle',
              network: {
                bytes: 2044,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233353',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233351',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233361',
                },
                project: {
                  id: '1528000009233360',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233358',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233362/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[trac] Incorrect spelling of log level Trace',
              network: {
                bytes: 9500,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233359',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233357',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233367',
                },
                project: {
                  id: '1528000009233366',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233364',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233368/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'A simple info log with something random <random> in the middle',
              network: {
                bytes: 7621,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233365',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233363',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'android/java',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233373',
                },
                project: {
                  id: '1528000009233372',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233370',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233374/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Error: This message has log level for info, but says Error instead',
              network: {
                bytes: 8837,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233371',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233369',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233379',
                },
                project: {
                  id: '1528000009233378',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233376',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233380/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Detailed trace log for deep diagnostics',
              network: {
                bytes: 3712,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233377',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233375',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233385',
                },
                project: {
                  id: '1528000009233384',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233382',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233386/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Error: This message has log level for info, but says Error instead',
              network: {
                bytes: 7273,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233383',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233381',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'nodejs',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233391',
                },
                project: {
                  id: '1528000009233390',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233388',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233392/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Detailed trace log for deep diagnostics',
              network: {
                bytes: 3684,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233389',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233387',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233397',
                },
                project: {
                  id: '1528000009233396',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233394',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233398/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Critical failure detected in payment service',
              network: {
                bytes: 2682,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233395',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233393',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'nodejs',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233403',
                },
                project: {
                  id: '1528000009233402',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233400',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233404/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'A simple info log with something random <random> in the middle',
              network: {
                bytes: 9675,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233401',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233399',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233409',
                },
                project: {
                  id: '1528000009233408',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233406',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233410/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '(trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
              network: {
                bytes: 9784,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233407',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233405',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233415',
                },
                project: {
                  id: '1528000009233414',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233412',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233416/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[inf] Incorrect spelling of log level Info',
              network: {
                bytes: 8056,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233413',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233411',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233421',
                },
                project: {
                  id: '1528000009233420',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233418',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233422/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[err] Incorrect spelling of log level Error',
              network: {
                bytes: 2793,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233419',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233417',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233427',
                },
                project: {
                  id: '1528000009233426',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233424',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233428/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[err] Incorrect spelling of log level Error',
              network: {
                bytes: 3195,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233425',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233423',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233433',
                },
                project: {
                  id: '1528000009233432',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233430',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233434/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Fatal error: cannot recover application state',
              network: {
                bytes: 8374,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233431',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233429',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233439',
                },
                project: {
                  id: '1528000009233438',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233436',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233440/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Fatal error: cannot recover application state',
              network: {
                bytes: 1503,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233437',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233435',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'android/java',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009233445',
                },
                project: {
                  id: '1528000009233444',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233442',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233446/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Error with certificate: "ca_trusted_fingerprint"',
              network: {
                bytes: 1904,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233443',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233441',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'php',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233451',
                },
                project: {
                  id: '1528000009233450',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233448',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233452/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 6738,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233449',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233447',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233457',
                },
                project: {
                  id: '1528000009233456',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233454',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233458/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 9936,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233455',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233453',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233463',
                },
                project: {
                  id: '1528000009233462',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233460',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233464/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 8471,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233461',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233459',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233469',
                },
                project: {
                  id: '1528000009233468',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233466',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233470/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 1334,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233467',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233465',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233475',
                },
                project: {
                  id: '1528000009233474',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233472',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233476/error.txt',
                },
                level: 'emergency',
              },
              network: {
                bytes: 7007,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233473',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233471',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233481',
                },
                project: {
                  id: '1528000009233480',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233478',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233482/error.txt',
                },
                level: 'alert',
              },
              network: {
                bytes: 7629,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233479',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233477',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233487',
                },
                project: {
                  id: '1528000009233486',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233484',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233488/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 5237,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233485',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233483',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'android/java',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233493',
                },
                project: {
                  id: '1528000009233492',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233490',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233494/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 7818,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233491',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233489',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233499',
                },
                project: {
                  id: '1528000009233498',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233496',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233500/error.txt',
                },
                level: 'error',
              },
              network: {
                bytes: 6323,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233497',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233495',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'android/java',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233505',
                },
                project: {
                  id: '1528000009233504',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233502',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233506/error.txt',
                },
                level: 'emergency',
              },
              network: {
                bytes: 8680,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233503',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233501',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233511',
                },
                project: {
                  id: '1528000009233510',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233508',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233512/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 2616,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233509',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233507',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233517',
                },
                project: {
                  id: '1528000009233516',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233514',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233518/error.txt',
                },
                level: 'critical',
              },
              network: {
                bytes: 7275,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233515',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233513',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233523',
                },
                project: {
                  id: '1528000009233522',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233520',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233524/error.txt',
                },
                level: 'critical',
              },
              network: {
                bytes: 9195,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233521',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233519',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233529',
                },
                project: {
                  id: '1528000009233528',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233526',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233530/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 9467,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233527',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233525',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233535',
                },
                project: {
                  id: '1528000009233534',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233532',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233536/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 6990,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233533',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233531',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233541',
                },
                project: {
                  id: '1528000009233540',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233538',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233542/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 1287,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233539',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233537',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233547',
                },
                project: {
                  id: '1528000009233546',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233544',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233548/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 6308,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233545',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233543',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233553',
                },
                project: {
                  id: '1528000009233552',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233550',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233554/error.txt',
                },
                level: 'debug',
              },
              network: {
                bytes: 5126,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233551',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233549',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233559',
                },
                project: {
                  id: '1528000009233558',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233556',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: '[emerg] Incorrect spelling of log level Emergency',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233560/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 1963,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233557',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233555',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233565',
                },
                project: {
                  id: '1528000009233564',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233562',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Yet another debug log',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233566/error.txt',
                },
                level: 'debug',
              },
              network: {
                bytes: 5497,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233563',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233561',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233571',
                },
                project: {
                  id: '1528000009233570',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233568',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Notice: user profile updated successfully',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233572/error.txt',
                },
                level: 'notice',
              },
              network: {
                bytes: 6208,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233569',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233567',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233577',
                },
                project: {
                  id: '1528000009233576',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233574',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Fatal error: cannot recover application state',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233578/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 8974,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233575',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233573',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233583',
                },
                project: {
                  id: '1528000009233582',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233580',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: '[trac] Incorrect spelling of log level Trace',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233584/error.txt',
                },
                level: 'trace',
              },
              network: {
                bytes: 5743,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233581',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233579',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233589',
                },
                project: {
                  id: '1528000009233588',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233586',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Notice: user profile updated successfully',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233590/error.txt',
                },
                level: 'notice',
              },
              network: {
                bytes: 9868,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233587',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233585',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233595',
                },
                project: {
                  id: '1528000009233594',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233592',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: '[fat] Incorrect spelling of log level Fatal',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233596/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 3247,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233593',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233591',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233601',
                },
                project: {
                  id: '1528000009233600',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233598',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Fatal error: cannot recover application state',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233602/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 889,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233599',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233597',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233607',
                },
                project: {
                  id: '1528000009233606',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233604',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Detailed trace log for deep diagnostics',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233608/error.txt',
                },
                level: 'trace',
              },
              network: {
                bytes: 1958,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233605',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233603',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009233613',
                },
                project: {
                  id: '1528000009233612',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009233610',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Emergency! Core system unavailable',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233614/error.txt',
                },
                level: 'emergency',
              },
              network: {
                bytes: 6867,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009233611',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233609',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233619',
                },
                project: {
                  id: '1528000009233618',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233616',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original:
                  'Log Level Not present in the log message: (trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233620/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 2563,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233617',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233615',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233625',
                },
                project: {
                  id: '1528000009233624',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233622',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Notice: user profile updated successfully',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233626/error.txt',
                },
                level: 'notice',
              },
              network: {
                bytes: 4386,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233623',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233621',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233631',
                },
                project: {
                  id: '1528000009233630',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233628',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: 'Warning: potential configuration issue detected',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233632/error.txt',
                },
                level: 'warning',
              },
              network: {
                bytes: 9769,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233629',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009233627',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009233637',
                },
                project: {
                  id: '1528000009233636',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009233634',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: '[fat] Incorrect spelling of log level Fatal',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233638/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 7478,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009233635',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233633',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.700Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009233643',
                },
                project: {
                  id: '1528000009233642',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009233640',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.835Z',
                original: '[trac] Incorrect spelling of log level Trace',
                start: '2026-01-30T16:36:12.835Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009233644/error.txt',
                },
                level: 'trace',
              },
              network: {
                bytes: 4854,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009233641',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009233639',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232665',
                },
                project: {
                  id: '1528000009232664',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232662',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232666/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message:
                'Log Level Not present in the log message: (trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
              network: {
                bytes: 5684,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232663',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232661',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232671',
                },
                project: {
                  id: '1528000009232670',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232668',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232672/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Notice: user profile updated successfully',
              network: {
                bytes: 2979,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232669',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232667',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232677',
                },
                project: {
                  id: '1528000009232676',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232674',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232678/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'A simple info log with something random <random> in the middle',
              network: {
                bytes: 7831,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232675',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232673',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232683',
                },
                project: {
                  id: '1528000009232682',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232680',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232684/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message:
                'Log Level Not present in the log message: (trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
              network: {
                bytes: 563,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232681',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232679',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232689',
                },
                project: {
                  id: '1528000009232688',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232686',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232690/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[fat] Incorrect spelling of log level Fatal',
              network: {
                bytes: 3961,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232687',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232685',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232695',
                },
                project: {
                  id: '1528000009232694',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232692',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232696/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message:
                'Log Level Not present in the log message: (trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
              network: {
                bytes: 7863,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232693',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232691',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232701',
                },
                project: {
                  id: '1528000009232700',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232698',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232702/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Fatal error: cannot recover application state',
              network: {
                bytes: 4821,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232699',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232697',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232707',
                },
                project: {
                  id: '1528000009232706',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232704',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232708/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Detailed trace log for deep diagnostics',
              network: {
                bytes: 6014,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232705',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232703',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232713',
                },
                project: {
                  id: '1528000009232712',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232710',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232714/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Emergency! Core system unavailable',
              network: {
                bytes: 8067,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232711',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232709',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232719',
                },
                project: {
                  id: '1528000009232718',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232716',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232720/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[fat] Incorrect spelling of log level Fatal',
              network: {
                bytes: 1515,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232717',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232715',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232725',
                },
                project: {
                  id: '1528000009232724',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232722',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232726/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Alert: service downtime detected',
              network: {
                bytes: 7984,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232723',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232721',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232731',
                },
                project: {
                  id: '1528000009232730',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232728',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232732/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Error: This message has log level for info, but says Error instead',
              network: {
                bytes: 3640,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232729',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232727',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'php',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232737',
                },
                project: {
                  id: '1528000009232736',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232734',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232738/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Emergency! Core system unavailable',
              network: {
                bytes: 3713,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232735',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232733',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232743',
                },
                project: {
                  id: '1528000009232742',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232740',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232744/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '[err] Incorrect spelling of log level Error',
              network: {
                bytes: 1100,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232741',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232739',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232749',
                },
                project: {
                  id: '1528000009232748',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232746',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232750/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Fatal error: cannot recover application state',
              network: {
                bytes: 3848,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232747',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232745',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'php',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232755',
                },
                project: {
                  id: '1528000009232754',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232752',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232756/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: 'Emergency! Core system unavailable',
              network: {
                bytes: 9323,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232753',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232751',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'android/java',
              },
              cloud: {
                availability_zone:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                instance: {
                  id: '1528000009232761',
                },
                project: {
                  id: '1528000009232760',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232758',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232762/error.txt',
                },
                level:
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
              },
              message: '(trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
              network: {
                bytes: 3645,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232759',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232757',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232767',
                },
                project: {
                  id: '1528000009232766',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232764',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232768/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 4964,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232765',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232763',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232773',
                },
                project: {
                  id: '1528000009232772',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232770',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232774/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 2788,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232771',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232769',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232779',
                },
                project: {
                  id: '1528000009232778',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232776',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232780/error.txt',
                },
                level: 'notice',
              },
              network: {
                bytes: 9627,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232777',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232775',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232785',
                },
                project: {
                  id: '1528000009232784',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232782',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232786/error.txt',
                },
                level: 'critical',
              },
              network: {
                bytes: 3985,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232783',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232781',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232791',
                },
                project: {
                  id: '1528000009232790',
                },
                provider: 'azure',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232788',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232792/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 6889,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232789',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232787',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232797',
                },
                project: {
                  id: '1528000009232796',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232794',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232798/error.txt',
                },
                level: 'warning',
              },
              network: {
                bytes: 637,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232795',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232793',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232803',
                },
                project: {
                  id: '1528000009232802',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232800',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232804/error.txt',
                },
                level: 'error',
              },
              network: {
                bytes: 6149,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232801',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232799',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232809',
                },
                project: {
                  id: '1528000009232808',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232806',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '223.72.43.22',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232810/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 4275,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232807',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232805',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'js-base',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232815',
                },
                project: {
                  id: '1528000009232814',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232812',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232816/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 8267,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232813',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232811',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232821',
                },
                project: {
                  id: '1528000009232820',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232818',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232822/error.txt',
                },
                level: 'warning',
              },
              network: {
                bytes: 5406,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232819',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232817',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232827',
                },
                project: {
                  id: '1528000009232826',
                },
                provider: 'aws',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232824',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232828/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 1510,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232825',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232823',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232833',
                },
                project: {
                  id: '1528000009232832',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232830',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232834/error.txt',
                },
                level: 'notice',
              },
              network: {
                bytes: 6818,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232831',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232829',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232839',
                },
                project: {
                  id: '1528000009232838',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232836',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232840/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 4265,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232837',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232835',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'python',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232845',
                },
                project: {
                  id: '1528000009232844',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232842',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232846/error.txt',
                },
                level: 'emergency',
              },
              network: {
                bytes: 5235,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232843',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232841',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232851',
                },
                project: {
                  id: '1528000009232850',
                },
                provider: 'gcp',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232848',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232852/error.txt',
                },
                level: 'debug',
              },
              network: {
                bytes: 8211,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232849',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232847',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232857',
                },
                project: {
                  id: '1528000009232856',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232854',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232858/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 625,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232855',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232853',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232863',
                },
                project: {
                  id: '1528000009232862',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232860',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232864/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 3345,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232861',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232859',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232869',
                },
                project: {
                  id: '1528000009232868',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232866',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232870/error.txt',
                },
                level: 'trace',
              },
              network: {
                bytes: 8361,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232867',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232865',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232875',
                },
                project: {
                  id: '1528000009232874',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232872',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'Warning: potential configuration issue detected',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232876/error.txt',
                },
                level: 'warning',
              },
              network: {
                bytes: 3858,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232873',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232871',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232881',
                },
                project: {
                  id: '1528000009232880',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232878',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: '[emerg] Incorrect spelling of log level Emergency',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232882/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 4873,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232879',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232877',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232887',
                },
                project: {
                  id: '1528000009232886',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232884',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'Fatal error: cannot recover application state',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 41.259099994786084,
                    lon: -95.85170005448163,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232888/error.txt',
                },
                level: 'fatal',
              },
              network: {
                bytes: 3005,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232885',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232883',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'nodejs',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232893',
                },
                project: {
                  id: '1528000009232892',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232890',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: '[inf] Incorrect spelling of log level Info',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232894/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 8409,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232891',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232889',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232899',
                },
                project: {
                  id: '1528000009232898',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232896',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original:
                  'Log Level Not present in the log message: (trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '178.173.228.103',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232900/error.txt',
                },
                level: 'dummy',
              },
              network: {
                bytes: 9326,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232897',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232895',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'php',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232905',
                },
                project: {
                  id: '1528000009232904',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232902',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'Yet another debug log',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232906/error.txt',
                },
                level: 'debug',
              },
              network: {
                bytes: 625,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232903',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232901',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'go',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232911',
                },
                project: {
                  id: '1528000009232910',
                },
                provider: 'azure',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232908',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'Emergency! Core system unavailable',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232912/error.txt',
                },
                level: 'emergency',
              },
              network: {
                bytes: 5214,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232909',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232907',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'ruby',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232917',
                },
                project: {
                  id: '1528000009232916',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232914',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'Yet another debug log',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '20.24.184.101',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232918/error.txt',
                },
                level: 'debug',
              },
              network: {
                bytes: 5027,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232915',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232913',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232923',
                },
                project: {
                  id: '1528000009232922',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232920',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: '(trace|debug|info|notice|warning|error|critical|alert|emergency|fatal)',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 35.61639997176826,
                    lon: 139.74249992519617,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232924/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 3750,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232921',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232919',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232929',
                },
                project: {
                  id: '1528000009232928',
                },
                provider: 'gcp',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232926',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: '[inf] Incorrect spelling of log level Info',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 39.914299990050495,
                    lon: 116.38609992340207,
                  },
                },
                ip: '147.161.184.179',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232930/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 7734,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232927',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232925',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'java',
              },
              cloud: {
                availability_zone: 'us-east-1a',
                instance: {
                  id: '1528000009232935',
                },
                project: {
                  id: '1528000009232934',
                },
                provider: 'aws',
                region: 'us-east-1',
              },
              container: {
                name: 'synth-service-1-1528000009232932',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'A simple info log with something random <random> in the middle',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232936/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 4883,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000021',
                  name: 'synth-cluster-2',
                },
                namespace: 'production',
                resource: {
                  id: '1528000009232933',
                },
              },
              service: {
                name: 'synth-service-1',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232931',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'dotnet',
              },
              cloud: {
                availability_zone: 'eu-central-1a',
                instance: {
                  id: '1528000009232941',
                },
                project: {
                  id: '1528000009232940',
                },
                provider: 'aws',
                region: 'eu-central-1',
              },
              container: {
                name: 'synth-service-0-1528000009232938',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'A simple info log with something random <random> in the middle',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 48.832299965433776,
                    lon: 2.407499933615327,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232942/error.txt',
                },
                level: 'info',
              },
              network: {
                bytes: 1704,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000020',
                  name: 'synth-cluster-1',
                },
                namespace: 'default',
                resource: {
                  id: '1528000009232939',
                },
              },
              service: {
                name: 'synth-service-0',
              },
              tls: {
                established: false,
              },
              trace: {
                id: '15280000000000000000000009232937',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'iOS/swift',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232947',
                },
                project: {
                  id: '1528000009232946',
                },
                provider: 'azure',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232944',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: 'Warning: potential configuration issue detected',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232948/error.txt',
                },
                level: 'warning',
              },
              network: {
                bytes: 5166,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232945',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232943',
              },
            },
            {
              '@timestamp': '2026-01-30T16:36:12.600Z',
              agent: {
                name: 'rum-js',
              },
              cloud: {
                availability_zone: 'area-51a',
                instance: {
                  id: '1528000009232953',
                },
                project: {
                  id: '1528000009232952',
                },
                provider: 'gcp',
                region: 'area-51',
              },
              container: {
                name: 'synth-service-2-1528000009232950',
              },
              data_stream: {
                dataset: 'synth',
                namespace: 'default',
                type: 'logs',
              },
              error: {
                stack_trace: 'Stacktrace',
              },
              event: {
                dataset: 'synth',
                end: '2026-01-30T16:37:12.733Z',
                original: '[trac] Incorrect spelling of log level Trace',
                start: '2026-01-30T16:36:12.733Z',
              },
              host: {
                geo: {
                  location: {
                    lat: 1.3035999750718474,
                    lon: 103.8553999364376,
                  },
                },
                ip: '34.136.92.88',
                name: 'synth-host',
              },
              input: {
                type: 'logs',
              },
              log: {
                file: {
                  path: '/logs/15280000000000000000000009232954/error.txt',
                },
                level: 'trace',
              },
              network: {
                bytes: 9512,
              },
              orchestrator: {
                cluster: {
                  id: '1528000000000022',
                  name: 'synth-cluster-3',
                },
                namespace: 'kube',
                resource: {
                  id: '1528000009232951',
                },
              },
              service: {
                name: 'synth-service-2',
              },
              tls: {
                established: true,
              },
              trace: {
                id: '15280000000000000000000009232949',
              },
            },
          ],
        },
        output: {
          source_id: 'unknown-custom-2026-01-30',
          system: 'unknown',
          expected_processors: {
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
            'Data already structured - no pipeline needed. LLM should correctly decline to suggest processing.',
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
