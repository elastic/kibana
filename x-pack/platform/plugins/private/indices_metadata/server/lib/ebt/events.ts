/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@elastic/ebt/client';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndexTemplatesStats,
  IndicesSettings,
  IndicesStats,
} from '../services/indices_metadata.types';

export const DATA_STREAM_EVENT: EventTypeOpts<DataStreams> = {
  eventType: 'indices-metadata-data-stream-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          datastream_name: {
            type: 'keyword',
            _meta: { description: 'Name of the data stream' },
          },
          ilm_policy: {
            type: 'keyword',
            _meta: { optional: true, description: 'ILM policy associated to the datastream' },
          },
          template: {
            type: 'keyword',
            _meta: { optional: true, description: 'Template associated to the datastream' },
          },
          indices: {
            type: 'array',
            items: {
              properties: {
                index_name: { type: 'date', _meta: { description: 'Index name' } },
                ilm_policy: { type: 'date', _meta: { optional: true, description: 'ILM policy' } },
              },
            },
            _meta: { optional: true, description: 'Indices associated with the data stream' },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const INDEX_STATS_EVENT: EventTypeOpts<IndicesStats> = {
  eventType: 'indices-metadata-index-stats-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index being monitored.' },
          },
          query_total: {
            type: 'long',
            _meta: {
              optional: true,
              description: 'The total number of search queries executed on the index.',
            },
          },
          query_time_in_millis: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total time spent on query execution across all search requests, measured in milliseconds.',
            },
          },

          docs_count_primaries: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents currently stored in the index (primary shards).',
            },
          },
          docs_deleted_primaries: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents that have been marked as deleted in the index (primary shards).',
            },
          },
          docs_total_size_in_bytes_primaries: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total size, in bytes, of all documents stored in the index, including storage overhead (primary shards).',
            },
          },
          docs_count: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents currently stored in the index (primary and replica shards).',
            },
          },
          docs_deleted: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents that have been marked as deleted in the index (primary and replica shards).',
            },
          },
          docs_total_size_in_bytes: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total size, in bytes, of all documents stored in the index, including storage overhead (primary and replica shards).',
            },
          },

          index_failed: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents failed to index (primary and replica shards).',
            },
          },
          index_failed_due_to_version_conflict: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'The total number of documents failed to index due to version conflict (primary and replica shards).',
            },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const ILM_STATS_EVENT: EventTypeOpts<IlmsStats> = {
  eventType: 'indices-metadata-ilm-stats-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index currently managed by the ILM  policy.' },
          },
          phase: {
            type: 'keyword',
            _meta: {
              optional: true,
              description:
                'The current phase of the ILM policy that the index is in (e.g., hot, warm, cold, frozen, or delete).',
            },
          },
          age: {
            type: 'text',
            _meta: {
              optional: true,
              description:
                'The age of the index since its creation, indicating how long it has existed.',
            },
          },
          policy_name: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The name of the ILM policy applied to this index.',
            },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const INDEX_SETTINGS_EVENT: EventTypeOpts<IndicesSettings> = {
  eventType: 'telemetry_index_settings_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          index_name: {
            type: 'keyword',
            _meta: { description: 'The name of the index.' },
          },
          index_mode: {
            type: 'keyword',
            _meta: { optional: true, description: 'Index mode.' },
          },
          source_mode: {
            type: 'keyword',
            _meta: { optional: true, description: 'Source mode.' },
          },
          default_pipeline: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Pipeline applied if no pipeline parameter specified when indexing.',
            },
          },
          final_pipeline: {
            type: 'keyword',
            _meta: {
              optional: true,
              description:
                'Pipeline applied to the document at the end of the indexing process, after the document has been indexed.',
            },
          },
        },
      },
      _meta: { description: 'Index settings' },
    },
  },
};

export const ILM_POLICY_EVENT: EventTypeOpts<IlmPolicies> = {
  eventType: 'indices-metadata-ilm-policy-event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          policy_name: {
            type: 'keyword',
            _meta: { description: 'The name of the ILM policy.' },
          },
          modified_date: {
            type: 'date',
            _meta: { description: 'The date when the ILM policy was last modified.' },
          },
          phases: {
            properties: {
              cold: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "cold" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "cold" phase of the ILM policy, applied when data is infrequently accessed.',
                },
              },
              delete: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "delete" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "delete" phase of the ILM policy, specifying when the index should be removed.',
                },
              },
              frozen: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "frozen" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "frozen" phase of the ILM policy, where data is fully searchable but stored with a reduced resource footprint.',
                },
              },
              hot: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "hot" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "hot" phase of the ILM policy, applied to actively written and queried data.',
                },
              },
              warm: {
                properties: {
                  min_age: {
                    type: 'text',
                    _meta: {
                      description:
                        'The minimum age before the index transitions to the "warm" phase.',
                    },
                  },
                },
                _meta: {
                  optional: true,
                  description:
                    'Configuration settings for the "warm" phase of the ILM policy, used for read-only data that is less frequently accessed.',
                },
              },
            },
            _meta: {
              description:
                'The different phases of the ILM policy that define how the index is managed over time.',
            },
          },
        },
      },
      _meta: { description: 'Datastreams' },
    },
  },
};

export const INDEX_TEMPLATES_EVENT: EventTypeOpts<IndexTemplatesStats> = {
  eventType: 'telemetry_index_templates_event',
  schema: {
    items: {
      type: 'array',
      items: {
        properties: {
          template_name: {
            type: 'keyword',
            _meta: { description: 'The name of the template.' },
          },
          index_mode: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The index mode.',
            },
          },
          datastream: {
            type: 'boolean',
            _meta: {
              description: 'Datastream dataset',
            },
          },
          package_name: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'The package name',
            },
          },
          managed_by: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Managed by',
            },
          },
          beat: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Shipper name',
            },
          },
          is_managed: {
            type: 'boolean',
            _meta: {
              optional: true,
              description: 'Whether the template is managed',
            },
          },
          composed_of: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'List of template components',
              },
            },
            _meta: { description: '' },
          },
          source_enabled: {
            type: 'boolean',
            _meta: {
              optional: true,
              description:
                'The _source field contains the original JSON document body that was provided at index time',
            },
          },
          source_includes: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'Fields included in _source, if enabled',
              },
            },
            _meta: { description: '' },
          },
          source_excludes: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: '',
              },
            },
            _meta: { description: 'Fields excludes from _source, if enabled' },
          },
        },
      },
      _meta: { description: 'Index templates info' },
    },
  },
};

export const registerEbtEvents = (analytics: AnalyticsServiceSetup) => {
  const events: Array<EventTypeOpts<{}>> = [
    DATA_STREAM_EVENT,
    INDEX_STATS_EVENT,
    ILM_STATS_EVENT,
    ILM_POLICY_EVENT,
    INDEX_TEMPLATES_EVENT,
    INDEX_SETTINGS_EVENT,
  ];

  events.forEach((eventConfig) => analytics.registerEventType(eventConfig));
};
