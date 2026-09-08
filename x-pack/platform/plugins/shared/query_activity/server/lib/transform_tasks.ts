/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TasksTaskInfo } from '@elastic/elasticsearch/lib/api/types';
import type { RunningQuery, QueryType } from '../../common/types';

const SEARCH_ACTION_PREFIX = 'indices:data/read/search';
const ESQL_ACTION_PREFIX = 'indices:data/read/esql';
const EQL_ACTION_PREFIX = 'indices:data/read/eql';
const SQL_ACTION_PREFIX = 'indices:data/read/sql';
const MSEARCH_ACTION_PREFIX = 'indices:data/read/msearch';
const ASYNC_SEARCH_ACTION_PREFIX = 'indices:data/read/async_search';

const INDICES_REGEX = /indices\[([^\]]*)\]/;
const SOURCE_REGEX = /source\[(\{.*\})\]/s;
const ASYNC_PREFIX_REGEX = /^async_search\{(.*)\}$/s;

/**
 * Maps an ES task action string to our QueryType.
 */
export function getQueryType(action: string): QueryType {
  if (action.startsWith(ESQL_ACTION_PREFIX)) {
    return 'ES|QL';
  }
  if (action.startsWith(EQL_ACTION_PREFIX)) {
    return 'EQL';
  }
  if (action.startsWith(SQL_ACTION_PREFIX)) {
    return 'SQL';
  }
  if (action.startsWith(MSEARCH_ACTION_PREFIX)) {
    return 'MSearch';
  }
  if (action.startsWith(ASYNC_SEARCH_ACTION_PREFIX)) {
    return 'Async search';
  }
  if (action.startsWith(SEARCH_ACTION_PREFIX)) {
    return 'DSL';
  }
  return 'Other';
}

/**
 * Extracts the Kibana application name from the X-Opaque-Id header.
 *
 * Format: `<requestId>;kibana:<type>:<name>:<id>[;child...]`
 * e.g. `fb299124;kibana:application:discover:new` → `discover`
 */
export function extractSource(xOpaqueId: string | undefined): string {
  if (!xOpaqueId) return '';

  const parts = xOpaqueId.split(';');
  for (const part of parts) {
    if (part.startsWith('kibana:')) {
      const segments = part.split(':');
      if (segments.length >= 3) {
        try {
          return decodeURIComponent(segments[2]);
        } catch {
          return segments[2];
        }
      }
    }
  }
  return '';
}

/**
 * Capitalises the first letter of a string.
 */
export function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Parses a DSL search task description into indices count and query JSON.
 *
 * Description formats:
 * - `indices[idx1,idx2], types[], search_type[QUERY_THEN_FETCH], source[{"query":{...}}]`
 * - `async_search{indices[...], search_type[...], source[{...}], preference[...]}`
 */
export function parseDslDescription(description: string): { indices: number; query: string } {
  const asyncMatch = ASYNC_PREFIX_REGEX.exec(description);
  const normalized = asyncMatch ? asyncMatch[1] : description;

  const indicesMatch = INDICES_REGEX.exec(normalized);
  const indicesCount =
    indicesMatch && indicesMatch[1] ? indicesMatch[1].split(',').filter(Boolean).length : 0;

  const sourceMatch = SOURCE_REGEX.exec(normalized);
  const query = sourceMatch ? sourceMatch[1] : '';

  return { indices: indicesCount, query };
}

/**
 * Parses an ES|QL task description. For ES|QL, the description IS the query text.
 * Extracts indices count from the FROM clause if present.
 */
export function parseEsqlDescription(description: string): { indices: number; query: string } {
  const query = description;

  const fromMatch = /^\s*FROM\s+([^|]+)/i.exec(query);
  const indices = fromMatch ? fromMatch[1].split(',').filter((s) => s.trim().length > 0).length : 0;

  return { indices, query };
}

/**
 * Returns true for top-level search/esql tasks that exceed the runtime threshold.
 */
export function isIncludedTask(task: TasksTaskInfo, thresholdNanos: number): boolean {
  if (task.parent_task_id !== undefined && task.parent_task_id !== null) {
    return false;
  }

  const action = task.action ?? '';
  if (
    !action.startsWith(SEARCH_ACTION_PREFIX) &&
    !action.startsWith(ESQL_ACTION_PREFIX) &&
    !action.startsWith(EQL_ACTION_PREFIX) &&
    !action.startsWith(SQL_ACTION_PREFIX) &&
    !action.startsWith(MSEARCH_ACTION_PREFIX) &&
    !action.startsWith(ASYNC_SEARCH_ACTION_PREFIX)
  ) {
    return false;
  }

  if ((task.running_time_in_nanos ?? 0) < thresholdNanos) {
    return false;
  }

  // Background async tasks (e.g. ES|QL submitted via POST /_esql/async) surface in the task
  // list with cancellable:false and an empty description once the initial HTTP handler task
  // has completed. They cannot be cancelled via the tasks API and have no query to display,
  // so there is nothing useful to show the user.
  if (!task.cancellable && !task.description) {
    return false;
  }

  return true;
}

/**
 * Transforms a flat list of ES TasksTaskInfo into RunningQuery objects,
 * applying filtering and field extraction.
 */
export function transformTasks(tasks: TasksTaskInfo[], thresholdNanos: number): RunningQuery[] {
  const results: RunningQuery[] = [];

  for (const task of tasks) {
    if (!isIncludedTask(task, thresholdNanos)) {
      continue;
    }

    if (task.start_time_in_millis == null) {
      continue;
    }

    const action = task.action ?? '';
    const queryType = getQueryType(action);
    const description = task.description ?? '';
    const headers = task.headers as Record<string, string> | undefined;
    const xOpaqueId = headers?.['X-Opaque-Id'];
    const source = capitalise(extractSource(xOpaqueId));
    const traceId = headers?.['trace.id'];

    let indices = 0;
    let query = '';

    if (queryType === 'ES|QL') {
      ({ indices, query } = parseEsqlDescription(description));
    } else if (queryType === 'EQL' || queryType === 'SQL') {
      indices = 0;
      query = description;
    } else {
      ({ indices, query } = parseDslDescription(description));
      if (!query && description) {
        query = description;
      }
    }

    results.push({
      taskId: `${task.node}:${task.id}`,
      queryType,
      source,
      startTime: task.start_time_in_millis,
      runningTimeMs: Math.round((task.running_time_in_nanos ?? 0) / 1_000_000),
      indices,
      query,
      traceId,
      xOpaqueId,
      cancellable: task.cancellable ?? false,
      cancelled: task.cancelled ?? false,
    });
  }

  return results;
}
