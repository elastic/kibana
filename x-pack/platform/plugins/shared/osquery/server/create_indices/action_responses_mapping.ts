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
        // Kibana's top-level `space_id` on the Fleet action never reaches the
        // agent, so it is also written inside the action's opaque `data` blob,
        // which osquerybeat copies onto this document as `action_data`. Reads
        // fall back to it via `matchActionDataSpaceId` (see buildSpaceIdFilter),
        // so it gates a space-isolation boundary and must not depend on dynamic
        // mapping staying enabled.
        //
        // This mapping only covers the Kibana-managed
        // `.logs-osquery_manager.action.responses-default` index. The results
        // index the live-query table reads (`logs-osquery_manager.result*`, see
        // query.all_results.dsl.ts) is package-managed, so there the field still
        // resolves through dynamic mapping until elastic/integrations#21368
        // lands. If that package ever sets `dynamic: false` on `action_data`,
        // the term silently matches nothing — hence the api_integration coverage
        // in action_results_space_scoping.ts.
        space_id: {
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
    schedule_execution_count: {
      type: 'long',
    },
    response_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    schedule_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    pack_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    space_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    started_at: {
      type: 'date',
    },
    planned_schedule_time: {
      type: 'date',
    },
  },
};
