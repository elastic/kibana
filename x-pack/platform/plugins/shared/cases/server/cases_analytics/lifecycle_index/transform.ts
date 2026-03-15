/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Owner } from '../../../common/constants/types';
import {
  getLifecycleTransformId,
  getLifecycleSourceIndex,
  getLifecycleDestinationIndexName,
  CAI_LIFECYCLE_INDEX_VERSION,
} from './constants';

/**
 * Returns a scripted_metric aggregation that counts documents matching a
 * specific `type` value. This produces a flat number in the transform output,
 * unlike `filter` aggregations which produce `{ doc_count: N }` objects that
 * break flat `long` mappings.
 */
function countByType(fieldName: string, typeValue: string) {
  return {
    [fieldName]: {
      scripted_metric: {
        init_script: 'state.count = 0',
        map_script: `if (doc['type'].value == '${typeValue}') { state.count++; }`,
        combine_script: 'return state.count',
        reduce_script: `
          long total = 0;
          for (s in states) { total += ((Number) s).longValue(); }
          return total;
        `,
      },
    },
  };
}

/**
 * Builds the ES Transform configuration for the case lifecycle index.
 *
 * The transform pivots on `case_id`, reading from the activity index and
 * producing one document per case with computed lifecycle metrics such as
 * time-to-close, counts of comments/pushes/reassignments, and key timestamps.
 */
export function getLifecycleTransformConfig(
  spaceId: string,
  owner: Owner
): TransformPutTransformRequest {
  return {
    transform_id: getLifecycleTransformId(spaceId, owner),
    _meta: { version: CAI_LIFECYCLE_INDEX_VERSION },
    source: {
      index: [getLifecycleSourceIndex(spaceId, owner)],
    },
    dest: {
      index: getLifecycleDestinationIndexName(spaceId, owner),
    },
    pivot: {
      group_by: {
        case_id: { terms: { field: 'case_id' } },
      },
      aggregations: {
        // --- Timestamps ---
        case_created_at: {
          scripted_metric: {
            init_script: 'state.ts = null',
            map_script: `
              if (doc['type'].value == 'create_case' && doc['created_at'].size() > 0) {
                state.ts = doc['created_at'].value.toInstant().toEpochMilli();
              }
            `,
            combine_script: 'return state.ts',
            reduce_script: `
              for (s in states) { if (s != null) return s; }
              return null;
            `,
          },
        },
        closed_at: {
          scripted_metric: {
            init_script: 'state.ts = null',
            map_script: `
              if (doc['type'].value == 'status'
                  && doc.containsKey('payload.status')
                  && doc['payload.status'].size() > 0
                  && doc['payload.status'].value == 'closed'
                  && doc['created_at'].size() > 0) {
                long t = doc['created_at'].value.toInstant().toEpochMilli();
                if (state.ts == null || t > state.ts) { state.ts = t; }
              }
            `,
            combine_script: 'return state.ts',
            reduce_script: `
              long latest = -1L;
              boolean found = false;
              for (s in states) {
                if (s != null) {
                  long v = ((Number) s).longValue();
                  if (!found || v > latest) { latest = v; found = true; }
                }
              }
              return found ? latest : null;
            `,
          },
        },
        first_comment_at: {
          scripted_metric: {
            init_script: 'state.ts = null',
            map_script: `
              if (doc['type'].value == 'comment' && doc['created_at'].size() > 0) {
                long t = doc['created_at'].value.toInstant().toEpochMilli();
                if (state.ts == null || t < state.ts) { state.ts = t; }
              }
            `,
            combine_script: 'return state.ts',
            reduce_script: `
              long earliest = Long.MAX_VALUE;
              boolean found = false;
              for (s in states) {
                if (s != null) {
                  long v = ((Number) s).longValue();
                  if (!found || v < earliest) { earliest = v; found = true; }
                }
              }
              return found ? earliest : null;
            `,
          },
        },
        first_assignment_at: {
          scripted_metric: {
            init_script: 'state.ts = null',
            map_script: `
              if (doc['type'].value == 'assignees' && doc['created_at'].size() > 0) {
                long t = doc['created_at'].value.toInstant().toEpochMilli();
                if (state.ts == null || t < state.ts) { state.ts = t; }
              }
            `,
            combine_script: 'return state.ts',
            reduce_script: `
              long earliest = Long.MAX_VALUE;
              boolean found = false;
              for (s in states) {
                if (s != null) {
                  long v = ((Number) s).longValue();
                  if (!found || v < earliest) { earliest = v; found = true; }
                }
              }
              return found ? earliest : null;
            `,
          },
        },
        latest_activity_at: {
          max: { field: 'created_at' },
        },

        // --- Durations (computed via scripted_metric to avoid bucket_script null issues) ---
        time_to_close_ms: {
          scripted_metric: {
            init_script: 'state.created = null; state.closed = null;',
            map_script: `
              if (doc['created_at'].size() > 0) {
                long t = doc['created_at'].value.toInstant().toEpochMilli();
                if (doc['type'].value == 'create_case') {
                  state.created = t;
                }
                if (doc['type'].value == 'status'
                    && doc.containsKey('payload.status')
                    && doc['payload.status'].size() > 0
                    && doc['payload.status'].value == 'closed') {
                  if (state.closed == null || t > ((Number) state.closed).longValue()) { state.closed = t; }
                }
              }
            `,
            combine_script: 'return ["created": state.created, "closed": state.closed]',
            reduce_script: `
              long created = 0L; long closed = 0L;
              boolean hasCreated = false; boolean hasClosed = false;
              for (s in states) {
                if (s.created != null) { created = ((Number) s.created).longValue(); hasCreated = true; }
                if (s.closed != null) {
                  long cv = ((Number) s.closed).longValue();
                  if (!hasClosed || cv > closed) { closed = cv; hasClosed = true; }
                }
              }
              if (hasCreated && hasClosed) return closed - created;
              return null;
            `,
          },
        },
        time_to_first_comment_ms: {
          scripted_metric: {
            init_script: 'state.created = null; state.firstComment = null;',
            map_script: `
              if (doc['created_at'].size() > 0) {
                long t = doc['created_at'].value.toInstant().toEpochMilli();
                if (doc['type'].value == 'create_case') {
                  state.created = t;
                }
                if (doc['type'].value == 'comment') {
                  if (state.firstComment == null || t < ((Number) state.firstComment).longValue()) { state.firstComment = t; }
                }
              }
            `,
            combine_script: 'return ["created": state.created, "firstComment": state.firstComment]',
            reduce_script: `
              long created = 0L; long first = 0L;
              boolean hasCreated = false; boolean hasFirst = false;
              for (s in states) {
                if (s.created != null) { created = ((Number) s.created).longValue(); hasCreated = true; }
                if (s.firstComment != null) {
                  long fv = ((Number) s.firstComment).longValue();
                  if (!hasFirst || fv < first) { first = fv; hasFirst = true; }
                }
              }
              if (hasCreated && hasFirst) return first - created;
              return null;
            `,
          },
        },
        time_to_first_assignment_ms: {
          scripted_metric: {
            init_script: 'state.created = null; state.firstAssign = null;',
            map_script: `
              if (doc['created_at'].size() > 0) {
                long t = doc['created_at'].value.toInstant().toEpochMilli();
                if (doc['type'].value == 'create_case') {
                  state.created = t;
                }
                if (doc['type'].value == 'assignees') {
                  if (state.firstAssign == null || t < ((Number) state.firstAssign).longValue()) { state.firstAssign = t; }
                }
              }
            `,
            combine_script: 'return ["created": state.created, "firstAssign": state.firstAssign]',
            reduce_script: `
              long created = 0L; long first = 0L;
              boolean hasCreated = false; boolean hasFirst = false;
              for (s in states) {
                if (s.created != null) { created = ((Number) s.created).longValue(); hasCreated = true; }
                if (s.firstAssign != null) {
                  long fv = ((Number) s.firstAssign).longValue();
                  if (!hasFirst || fv < first) { first = fv; hasFirst = true; }
                }
              }
              if (hasCreated && hasFirst) return first - created;
              return null;
            `,
          },
        },

        // --- Counts (scripted_metric to produce flat numbers; filter aggs
        //     produce { doc_count: N } objects which break long mappings) ---
        total_actions: { value_count: { field: 'case_id' } },
        ...countByType('total_comments', 'comment'),
        ...countByType('total_status_changes', 'status'),
        ...countByType('total_severity_changes', 'severity'),
        ...countByType('total_reassignments', 'assignees'),
        ...countByType('total_pushes', 'pushed'),
        ...countByType('total_tag_changes', 'tags'),
        ...countByType('total_category_changes', 'category'),

        // --- Metadata (carry forward from first event) ---
        owner: {
          scripted_metric: {
            init_script: "state.val = ''",
            map_script: `
              if (doc['owner'].size() > 0 && state.val.isEmpty()) {
                state.val = doc['owner'].value;
              }
            `,
            combine_script: 'return state.val',
            reduce_script: `
              for (s in states) { if (s != null && !s.isEmpty()) return s; }
              return '';
            `,
          },
        },
        space_ids: {
          scripted_metric: {
            init_script: 'state.val = null',
            map_script: `
              if (state.val == null && doc['space_ids'].size() > 0) {
                state.val = new ArrayList(doc['space_ids']);
              }
            `,
            combine_script: 'return state.val',
            reduce_script: `
              for (s in states) { if (s != null) return s; }
              return null;
            `,
          },
        },
      },
    },
    frequency: '5m',
    sync: {
      time: {
        // Use @timestamp (set to indexing time by the Painless reindex script)
        // rather than created_at (the original user-action time). This ensures
        // every document added by any reindex run is treated as "new" by the
        // next checkpoint, so historical data is never permanently missed even
        // when the activity index is populated after the transform's first
        // checkpoint has already run.
        field: '@timestamp',
        delay: '60s',
      },
    },
    settings: {
      max_page_search_size: 500,
    },
    description: 'Cases analytics: per-case lifecycle metrics derived from user-action activity',
  };
}
