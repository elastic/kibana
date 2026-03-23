/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { FieldDefinition } from '@kbn/streams-schema';

export const ecsLogsSettings: IndicesIndexSettings = {
  index: {
    mode: 'logsdb',
    codec: 'best_compression',
    sort: {
      field: ['host.name', '@timestamp'],
      order: ['asc', 'desc'],
    },
    mapping: {
      total_fields: {
        ignore_dynamic_beyond_limit: true,
      },
      ignore_malformed: true,
    },
  },
};

export const ecsBaseFields: FieldDefinition = {
  '@timestamp': {
    type: 'date',
  },
  'stream.name': {
    type: 'system',
  },
  'scope.name': {
    type: 'keyword',
    ignore_above: 1024,
  },
  'host.name': {
    type: 'keyword',
    ignore_above: 1024,
  },
  'trace.id': {
    type: 'keyword',
    ignore_above: 1024,
  },
  'span.id': {
    type: 'keyword',
    ignore_above: 1024,
  },
  'service.name': {
    type: 'keyword',
    ignore_above: 1024,
  },
  message: {
    type: 'match_only_text',
  },
  'log.level': {
    type: 'keyword',
    ignore_above: 1024,
  },
};
