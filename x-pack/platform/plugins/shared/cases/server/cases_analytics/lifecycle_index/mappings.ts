/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const CAI_LIFECYCLE_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    case_id: {
      type: 'keyword',
    },
    // Timestamps
    case_created_at: {
      type: 'date',
    },
    closed_at: {
      type: 'date',
    },
    first_comment_at: {
      type: 'date',
    },
    first_assignment_at: {
      type: 'date',
    },
    latest_activity_at: {
      type: 'date',
    },
    // Durations (milliseconds)
    time_to_close_ms: {
      type: 'long',
    },
    time_to_first_comment_ms: {
      type: 'long',
    },
    time_to_first_assignment_ms: {
      type: 'long',
    },
    // Counts
    total_actions: {
      type: 'long',
    },
    total_comments: {
      type: 'long',
    },
    total_status_changes: {
      type: 'long',
    },
    total_severity_changes: {
      type: 'long',
    },
    total_reassignments: {
      type: 'long',
    },
    total_pushes: {
      type: 'long',
    },
    total_tag_changes: {
      type: 'long',
    },
    total_category_changes: {
      type: 'long',
    },
    // Metadata carried from events
    owner: {
      type: 'keyword',
    },
    space_ids: {
      type: 'keyword',
    },
  },
};
