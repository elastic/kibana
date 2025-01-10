/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FIELD_QUEUE_TIME_MS = 'queue_time_ms';
export const FIELD_EXECUTION_TIME_MS = 'execution_time_ms';

export const runtimeFields = {
  [FIELD_QUEUE_TIME_MS]: {
    type: 'long',
    script: {
      source:
        `if (!doc.containsKey('created_at') || doc['created_at'].empty) { return; }\n` +
        `if (!doc.containsKey('started_at') || doc['started_at'].empty) { return; }\n` +
        `emit(doc['started_at'].value.millis - doc['created_at'].value.millis);`,
    },
  },
  [FIELD_EXECUTION_TIME_MS]: {
    type: 'long',
    script: {
      source:
        `if (!doc.containsKey('completed_at') || doc['completed_at'].empty) { return; }\n` +
        `if (!doc.containsKey('started_at') || doc['started_at'].empty) { return; }\n` +
        `emit(doc['completed_at'].value.millis - doc['started_at'].value.millis);`,
    },
  },
} as const;

export const runtimeFieldKeys = [FIELD_QUEUE_TIME_MS, FIELD_EXECUTION_TIME_MS];
