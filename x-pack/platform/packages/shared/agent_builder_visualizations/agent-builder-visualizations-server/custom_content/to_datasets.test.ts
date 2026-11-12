/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCustomContentQueryChanges } from './to_datasets';

const changes = (params: Partial<Parameters<typeof toCustomContentQueryChanges>[0]>) =>
  toCustomContentQueryChanges({
    nlQuery: 'Show KPI',
    existingQueries: [],
    isNewPanel: false,
    ...params,
  });

describe('toCustomContentQueryChanges', () => {
  describe('a new panel', () => {
    it('generates the first query from the request, from the given index', () => {
      expect(changes({ isNewPanel: true, hasData: true, index: 'logs-*' })).toEqual({
        datasets: [{ description: 'Show KPI', index: 'logs-*' }],
      });
    });

    it('is data-free when hasData is false, unless a query is supplied', () => {
      expect(changes({ isNewPanel: true, hasData: false })).toEqual({ clearQueries: true });
      expect(changes({ isNewPanel: true, hasData: false, esql: 'FROM a' })).toEqual({
        datasets: [{ esql: 'FROM a' }],
      });
    });
  });

  describe('an edit', () => {
    const existingQueries = ['FROM stored'];

    it('keeps the queries by default, and when a supplied query is blank', () => {
      expect(changes({ existingQueries })).toEqual({});
      expect(changes({ existingQueries, esql: '  ', hasData: true })).toEqual({});
    });

    it('replaces the first query with a supplied one, which wins over regenerating', () => {
      expect(changes({ existingQueries, esql: 'FROM a', regenerateESQL: true })).toEqual({
        datasets: [{ esql: 'FROM a' }],
      });
    });

    it('removes the queries when esql is null or hasData is false', () => {
      expect(changes({ existingQueries, esql: null })).toEqual({ clearQueries: true });
      expect(changes({ existingQueries, hasData: false })).toEqual({ clearQueries: true });
    });

    it('regenerates the first query, or generates one when the panel has none and has data', () => {
      expect(changes({ existingQueries, regenerateESQL: true })).toEqual({
        datasets: [{ description: 'Show KPI', index: undefined }],
      });
      expect(changes({ hasData: true })).toEqual({
        datasets: [{ description: 'Show KPI', index: undefined }],
      });
    });
  });

  describe('datasets', () => {
    it('are used as they are, with the index for the descriptions that have none of their own', () => {
      expect(
        changes({
          index: 'logs',
          datasets: [
            { description: 'totals' },
            { description: 'hosts', index: 'hosts' },
            { esql: 'FROM a' },
          ],
        })
      ).toEqual({
        datasets: [
          { description: 'totals', index: 'logs' },
          { description: 'hosts', index: 'hosts' },
          { esql: 'FROM a' },
        ],
      });
    });

    it('cannot be combined with the single-query fields', () => {
      const datasets = [{ description: 'totals' }];
      expect(() => changes({ datasets, esql: 'FROM a' })).toThrow('datasets replaces');
      expect(() => changes({ datasets, hasData: false })).toThrow('datasets replaces');
      expect(() => changes({ datasets, regenerateESQL: true })).toThrow('datasets replaces');
    });
  });
});
