/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_FILTER_CASE_IDS } from '../../../../common/constants';
import { buildCaseSelectionSearch, readCaseSelection } from './case_selection';

const response = (ids: string[], total: number = ids.length): estypes.MsearchResponseItem => ({
  took: 1,
  timed_out: false,
  status: 200,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: {
    total: { value: total, relation: 'eq' },
    hits: ids.map((id) => ({ _index: '.cases', _id: id, _source: { case: { id } } })),
  },
});

describe('case selection', () => {
  describe('buildCaseSelectionSearch', () => {
    it('keeps the space, owner, list case ids, and close date range as separate filter entries', () => {
      const request = buildCaseSelectionSearch({
        spaceId: 'kpi-demo',
        owner: 'cases',
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-08T00:00:00.000Z',
        caseIds: ['c1', 'c2'],
      });

      expect(request.index).toBe('cases');
      expect(request.body.size).toBe(MAX_KPI_FILTER_CASE_IDS);
      expect(request.body.track_total_hits).toBe(true);
      expect(request.body._source).toEqual(['case.id']);
      expect(request.body.query?.bool?.filter).toEqual([
        { term: { space_id: 'kpi-demo' } },
        { term: { owner: 'cases' } },
        { terms: { 'case.id': ['c1', 'c2'] } },
        {
          range: {
            'case.closed_at': { gte: '2026-11-01T00:00:00.000Z', lte: '2026-11-08T00:00:00.000Z' },
          },
        },
        { exists: { field: 'case.closed_at' } },
      ]);
    });

    it('leaves out the open cases when the context has no range', () => {
      const request = buildCaseSelectionSearch({ spaceId: 'kpi-demo', owner: 'cases' });

      expect(request.body.query?.bool?.filter).toEqual([
        { term: { space_id: 'kpi-demo' } },
        { term: { owner: 'cases' } },
        { exists: { field: 'case.closed_at' } },
      ]);
    });

    describe('case query', () => {
      const context = { spaceId: 'kpi-demo', owner: 'cases' };
      // an admin text with an or that names another space
      const caseQuery = 'case.category: Incident or space_id: other';
      const getFilter = (
        ...args: Parameters<typeof buildCaseSelectionSearch>
      ): Array<Record<string, unknown>> =>
        buildCaseSelectionSearch(...args).body.query?.bool?.filter as Array<
          Record<string, unknown>
        >;

      it('keeps the case query in its own clause and the forced clauses separate', () => {
        const filter = getFilter(context, { caseQuery });

        expect(filter.slice(0, 2)).toEqual([
          { term: { space_id: 'kpi-demo' } },
          { term: { owner: 'cases' } },
        ]);
        expect(filter).toHaveLength(4);
        expect(JSON.stringify(filter[3])).toContain('other');
        expect(JSON.stringify(filter.slice(0, 3))).not.toContain('other');
      });

      it('has the close date range and the case query for the close date basis', () => {
        const filter = getFilter(
          { ...context, from: '2026-11-01T00:00:00.000Z' },
          { basis: 'case_closed_at', caseQuery: 'case.category: Incident' }
        );

        expect(filter).toEqual(
          expect.arrayContaining([
            { range: { 'case.closed_at': { gte: '2026-11-01T00:00:00.000Z' } } },
            { exists: { field: 'case.closed_at' } },
          ])
        );
        expect(JSON.stringify(filter[filter.length - 1])).toContain('Incident');
      });

      it('has no close date range for the attach date basis', () => {
        const filter = getFilter(
          { ...context, from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z' },
          { basis: 'attached_at', caseQuery: 'case.category: Incident' }
        );

        expect(JSON.stringify(filter)).not.toContain('case.closed_at');
        expect(filter).toEqual(
          expect.arrayContaining([
            { range: { 'case.updated_at': { gte: '2026-11-01T00:00:00.000Z' } } },
          ])
        );
        expect(JSON.stringify(filter)).not.toContain('2026-11-08');
      });

      it('throws for a case query that does not parse', () => {
        expect(() =>
          buildCaseSelectionSearch(context, { caseQuery: 'case.category: "IR" or (case.status: *' })
        ).toThrow();
      });
    });
  });

  describe('readCaseSelection', () => {
    it('returns the case ids', () => {
      expect(readCaseSelection(response(['c1', 'c2']))).toEqual({ type: 'ids', ids: ['c1', 'c2'] });
    });

    it('returns an error over the limit', () => {
      expect(readCaseSelection(response([], MAX_KPI_FILTER_CASE_IDS + 1))).toEqual({
        type: 'error',
        message: expect.stringContaining('Select a shorter range'),
      });
    });

    it('returns an error for a missing, failed, or incomplete response', () => {
      expect(readCaseSelection(undefined).type).toBe('error');
      expect(
        readCaseSelection({
          status: 500,
          error: { type: 'x', reason: 'boom' },
        } as estypes.MsearchResponseItem).type
      ).toBe('error');
      expect(readCaseSelection({ ...response([]), timed_out: true }).type).toBe('error');
    });
  });
});
