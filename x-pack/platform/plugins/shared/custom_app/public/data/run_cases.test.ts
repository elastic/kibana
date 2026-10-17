/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import type { CasesSource } from '@kbn/custom-app-common';
import { CASES_COLUMNS, createRunCases } from './run_cases';

const http = { get: jest.fn() };
const run = createRunCases({ http: http as never });
const signal = new AbortController().signal;

const context = { timeRange: { from: 'now-24h', to: 'now' } } as FetchContext;

const found = (overrides = {}) => ({
  id: 'case-1',
  title: 'Suspicious login',
  description: 'Seen twice',
  status: 'open',
  severity: 'high',
  owner: 'securitySolution',
  tags: ['a', 'b'],
  assignees: [{ uid: 'u1' }, { uid: 'u2' }],
  category: null,
  created_at: '2026-10-16T10:00:00.000Z',
  updated_at: '2026-10-16T11:00:00.000Z',
  totalAlerts: 3,
  totalComment: 5,
  ...overrides,
});

const call = (
  source: Partial<CasesSource> = {},
  state: Record<string, string | number | boolean> = {}
) => run({ type: 'cases', ...source }, { context, state }, signal);

const lastQuery = () => http.get.mock.calls.at(-1)?.[1].query as Record<string, unknown>;

describe('fetching the cases of a source', () => {
  beforeEach(() => {
    http.get.mockReset().mockResolvedValue({ cases: [found()], total: 1 });
  });

  it('asks the public cases API, with the cancellation of the run', async () => {
    await call();

    expect(http.get).toHaveBeenCalledWith('/api/cases/_find', expect.objectContaining({ signal }));
  });

  it('asks for the most recently updated first, a page of fifty, when it is asked for nothing', async () => {
    await call();

    expect(lastQuery()).toEqual({
      sortField: 'updatedAt',
      sortOrder: 'desc',
      page: 1,
      perPage: 50,
    });
  });

  it('passes the filters it was given, with a tag as the API names it', async () => {
    await call({ status: 'open', severity: 'critical', search: 'login', tag: 'custom-app' });

    expect(lastQuery()).toMatchObject({
      status: 'open',
      severity: 'critical',
      search: 'login',
      tags: 'custom-app',
    });
  });

  it('takes a filter from the value of the app it names, as it is when it runs', async () => {
    await call(
      { status: { fromState: 'status' }, search: { fromState: 'q' } },
      { status: 'closed', q: 'vpn' }
    );

    expect(lastQuery()).toMatchObject({ status: 'closed', search: 'vpn' });
  });

  it('filters by nothing when a value is empty, which is what an "All" option says', async () => {
    await call({ status: { fromState: 'status' }, severity: '', search: '   ' }, { status: '' });

    expect(lastQuery()).not.toHaveProperty('status');
    expect(lastQuery()).not.toHaveProperty('severity');
    expect(lastQuery()).not.toHaveProperty('search');
  });

  it('filters by nothing when the value of the app is not there', async () => {
    await call({ tag: { fromState: 'gone' } });

    expect(lastQuery()).not.toHaveProperty('tags');
  });

  it('takes a value of the app that is not text as text', async () => {
    await call({ search: { fromState: 'n' } }, { n: 42 });

    expect(lastQuery()).toMatchObject({ search: '42' });
  });

  it('sorts as it was asked to, by the names the API has for the fields', async () => {
    await call({ sort: { field: 'created_at', order: 'asc' } });

    expect(lastQuery()).toMatchObject({ sortField: 'createdAt', sortOrder: 'asc' });
  });

  it('asks for as many as it was told, at most', async () => {
    await call({ limit: 7 });

    expect(lastQuery()).toMatchObject({ perPage: 7 });
  });

  describe('the period of the app', () => {
    it('limits the cases to those created in it when it is asked to', async () => {
      await call({ followTimeRange: true });

      expect(lastQuery()).toMatchObject({ from: 'now-24h', to: 'now' });
    });

    it('does not limit them otherwise, so that a case opened long ago is still in the list', async () => {
      await call();

      expect(lastQuery()).not.toHaveProperty('from');
      expect(lastQuery()).not.toHaveProperty('to');
    });

    it('does not limit them when there is no period', async () => {
      await run(
        { type: 'cases', followTimeRange: true },
        { context: {} as FetchContext, state: {} },
        signal
      );

      expect(lastQuery()).not.toHaveProperty('from');
    });
  });

  describe('what it gives', () => {
    it('gives one row for each case, under the same columns whatever the filters', async () => {
      const data = await call();

      expect(data.columns).toBe(CASES_COLUMNS);
      expect(data.rows).toHaveLength(1);
    });

    it('describes a case with plain values: tags as text, assignees as how many, null for what is missing', async () => {
      const { columns, rows } = await call();
      const byName = Object.fromEntries(columns.map(({ name }, index) => [name, rows[0][index]]));

      expect(byName).toEqual({
        id: 'case-1',
        title: 'Suspicious login',
        status: 'open',
        severity: 'high',
        owner: 'securitySolution',
        category: null,
        tags: 'a, b',
        assignee_count: 2,
        total_alerts: 3,
        total_comments: 5,
        created_at: '2026-10-16T10:00:00.000Z',
        updated_at: '2026-10-16T11:00:00.000Z',
        description: 'Seen twice',
      });
    });

    it('types the columns so that a table can sort and format them', () => {
      const types = Object.fromEntries(CASES_COLUMNS.map(({ name, type }) => [name, type]));

      expect(types).toMatchObject({
        created_at: 'date',
        updated_at: 'date',
        total_alerts: 'integer',
        assignee_count: 'integer',
        status: 'keyword',
      });
    });

    it('copes with a case that has no tags, assignees, totals or update yet', async () => {
      http.get.mockResolvedValue({
        cases: [
          found({
            tags: undefined,
            assignees: undefined,
            totalAlerts: undefined,
            totalComment: undefined,
            updated_at: null,
            description: undefined,
          }),
        ],
        total: 1,
      });

      const { columns, rows } = await call();
      const byName = Object.fromEntries(columns.map(({ name }, index) => [name, rows[0][index]]));

      expect(byName).toMatchObject({
        tags: '',
        assignee_count: 0,
        total_alerts: 0,
        updated_at: null,
        description: null,
      });
    });

    it('gives no rows when there are no cases', async () => {
      http.get.mockResolvedValue({ cases: [], total: 0 });

      expect((await call()).rows).toEqual([]);
    });
  });

  describe('counting', () => {
    it('gives only how many there are, as one value, and asks for a single case to know it', async () => {
      http.get.mockResolvedValue({ cases: [found()], total: 128 });

      const data = await call({ count: true, status: 'open' });

      expect(data).toEqual({ columns: [{ name: 'cases', type: 'integer' }], rows: [[128]] });
      expect(lastQuery()).toMatchObject({ perPage: 1, status: 'open' });
    });

    it('counts all of them, not the page, however many it is told to show', async () => {
      http.get.mockResolvedValue({ cases: [found()], total: 7 });

      await call({ count: true, limit: 10 });

      expect(lastQuery()).toMatchObject({ perPage: 1 });
    });
  });

  it('lets the error of the API through, which is what a component then shows', async () => {
    http.get.mockRejectedValue({ body: { message: 'Forbidden' } });

    await expect(call()).rejects.toEqual({ body: { message: 'Forbidden' } });
  });
});
