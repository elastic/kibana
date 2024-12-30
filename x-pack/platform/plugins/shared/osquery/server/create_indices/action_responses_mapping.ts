/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const actionResponsesMapping: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    action_data: {
      properties: {
        ecs_mapping: {
          type: 'object',
          enabled: false,
        },
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        platform: {
          type: 'keyword',
          ignore_above: 1024,
        },
        query: {
          type: 'keyword',
          ignore_above: 1024,
        },
        saved_query_id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        version: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    action_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    action_input_type: {
      type: 'keyword',
      ignore_above: 1024,
    },
    action_response: {
      properties: {
        osquery: {
          properties: {
            count: {
              type: 'long',
            },
          },
        },
      },
    },
    agent_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    completed_at: {
      type: 'date',
    },
    count: {
      type: 'long',
    },
    error: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    event: {
      properties: {
        agent_id_status: {
          type: 'keyword',
          ignore_above: 1024,
        },
        ingested: {
          type: 'date',
          format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
        },
      },
    },
    started_at: {
      type: 'date',
    },
  },
};
