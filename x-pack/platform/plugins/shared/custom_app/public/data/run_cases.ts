/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { DEFAULT_CASES_LIMIT, type CasesSource } from '@kbn/custom-app-common';
import type { RunCases, SourceData } from './data_layer';

/** The path of the public cases API, which lists the cases the user may see. */
const FIND_CASES_PATH = '/api/cases/_find';

/** What the sort fields of a source are called by the cases API. */
const SORT_FIELD = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  title: 'title',
  severity: 'severity',
  status: 'status',
} as const;

/** What of a case a component shows. Only what is plain, so that a table can sort and format it. */
interface FoundCase {
  id: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  owner: string;
  tags?: string[];
  assignees?: unknown[];
  category?: string | null;
  created_at: string;
  updated_at?: string | null;
  totalAlerts?: number;
  totalComment?: number;
}

interface FindCasesResponse {
  cases: FoundCase[];
  total: number;
}

/** The columns of the cases a component shows, which are the same whatever the filters. */
export const CASES_COLUMNS: SourceData['columns'] = [
  { name: 'id', type: 'keyword' },
  { name: 'title', type: 'keyword' },
  { name: 'status', type: 'keyword' },
  { name: 'severity', type: 'keyword' },
  { name: 'owner', type: 'keyword' },
  { name: 'category', type: 'keyword' },
  { name: 'tags', type: 'keyword' },
  { name: 'assignee_count', type: 'integer' },
  { name: 'total_alerts', type: 'integer' },
  { name: 'total_comments', type: 'integer' },
  { name: 'created_at', type: 'date' },
  { name: 'updated_at', type: 'date' },
  { name: 'description', type: 'keyword' },
];

const toRow = (found: FoundCase): unknown[] => [
  found.id,
  found.title,
  found.status,
  found.severity,
  found.owner,
  found.category ?? null,
  (found.tags ?? []).join(', '),
  (found.assignees ?? []).length,
  found.totalAlerts ?? 0,
  found.totalComment ?? 0,
  found.created_at,
  found.updated_at ?? null,
  found.description ?? null,
];

/**
 * Fetches the cases of a source with the session of the user, so what they see is what they may:
 * the cases API applies their privileges, and an owner they cannot read is left out. The filters
 * that come from a value of the app are read when it runs, and an empty one filters nothing.
 */
export const createRunCases =
  ({ http }: { http: HttpStart }): RunCases =>
  async (source: CasesSource, { context, state }, signal) => {
    const valueOf = (filter: CasesSource['status']): string => {
      if (filter === undefined) return '';
      const value = typeof filter === 'string' ? filter : state[filter.fromState];
      // A list is not a filter of the cases, which are filtered by one text.
      return value === undefined || Array.isArray(value) ? '' : String(value).trim();
    };

    const status = valueOf(source.status);
    const severity = valueOf(source.severity);
    const search = valueOf(source.search);
    const tag = valueOf(source.tag);
    const { timeRange } = context;

    const response = await http.get<FindCasesResponse>(FIND_CASES_PATH, {
      signal,
      query: {
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
        ...(search ? { search } : {}),
        ...(tag ? { tags: tag } : {}),
        ...(source.followTimeRange && timeRange ? { from: timeRange.from, to: timeRange.to } : {}),
        sortField: SORT_FIELD[source.sort?.field ?? 'updated_at'],
        sortOrder: source.sort?.order ?? 'desc',
        page: 1,
        // Only how many there are needs no cases, but the API gives its total with any page.
        perPage: source.count ? 1 : source.limit ?? DEFAULT_CASES_LIMIT,
      },
    });

    if (source.count) {
      return { columns: [{ name: 'cases', type: 'integer' }], rows: [[response.total]] };
    }
    return { columns: CASES_COLUMNS, rows: response.cases.map(toRow) };
  };
