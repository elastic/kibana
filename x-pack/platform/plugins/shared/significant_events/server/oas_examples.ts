/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * OAS example constants for the Streams API.
 *
 * These typed constants are imported directly by the Streams route definitions
 * via oasOperationObject, keeping examples co-located with routes and type-checked
 * against the @kbn/streams-schema types. If a schema change breaks an example
 * (e.g. a field is renamed or a required property is added), TypeScript catches
 * it immediately without any additional tooling or CI step.
 */

import type { QueryOccurrencesResponse, StreamQuery } from '@kbn/significant-events-schema';

// ---------------------------------------------------------------------------
// PUT /api/streams/{name}/queries/{queryId}
// ---------------------------------------------------------------------------

export const upsertStreamQueryRequest = {
  title: 'Error count by host',
  description: 'Count error-level log events grouped by host name',
  esql: {
    query: 'FROM logs* | WHERE log.level == "error" | STATS count = COUNT(*) BY host.name',
  },
};

// ---------------------------------------------------------------------------
// POST /api/streams/{name}/queries/_bulk
// ---------------------------------------------------------------------------

export const bulkStreamQueriesRequest = {
  operations: [
    {
      index: {
        id: 'error-count-by-host',
        title: 'Error count by host',
        description: 'Count error-level log events grouped by host name',
        esql: {
          query: 'FROM logs* | WHERE log.level == "error" | STATS count = COUNT(*) BY host.name',
        },
      },
    },
    {
      delete: { id: 'old-query-id' },
    },
  ],
};

// ---------------------------------------------------------------------------
// GET /api/streams/{name}/queries  –  list queries response
// ---------------------------------------------------------------------------

export const listStreamQueriesResponse: { queries: StreamQuery[] } = {
  queries: [
    {
      id: 'error-count-by-host',
      title: 'Error count by host',
      description: 'Count error-level log events grouped by host name',
      type: 'match',
      esql: {
        query: 'FROM logs.nginx | WHERE log.level == "error" | STATS count = COUNT(*) BY host.name',
      },
      severity_score: 75,
    },
    {
      id: 'high-latency-requests',
      title: 'High latency requests',
      description: 'Requests with response time above 2 seconds',
      type: 'match',
      esql: {
        query: 'FROM logs.nginx | WHERE http.response_time > 2000',
      },
      severity_score: 50,
    },
  ],
};

// ---------------------------------------------------------------------------
// GET /api/streams/{name}/significant_events  –  query occurrences response
// ---------------------------------------------------------------------------

export const getQueryOccurrencesResponse: QueryOccurrencesResponse = {
  queries: [
    {
      id: 'error-count-by-host',
      title: 'Error count by host',
      description: 'Count error-level log events grouped by host name',
      type: 'match',
      esql: {
        query: 'FROM logs.nginx | WHERE log.level == "error" | STATS count = COUNT(*) BY host.name',
      },
      severity_score: 75,
      stream_name: 'logs.nginx',
      occurrences: [
        { date: '2025-01-15T10:00:00.000Z', count: 42 },
        { date: '2025-01-15T11:00:00.000Z', count: 18 },
        { date: '2025-01-15T12:00:00.000Z', count: 7 },
      ],
      change_points: {
        type: {
          spike: { p_value: 0.002, change_point: 1 },
        },
      },
      rule_backed: false,
    },
  ],
  aggregated_occurrences: [
    { date: '2025-01-15T10:00:00.000Z', count: 42 },
    { date: '2025-01-15T11:00:00.000Z', count: 18 },
    { date: '2025-01-15T12:00:00.000Z', count: 7 },
  ],
};
