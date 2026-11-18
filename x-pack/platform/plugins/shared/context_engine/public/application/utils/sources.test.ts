/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectedSource } from '../components/ai_index_detail/sources/types';
import {
  createIndexEsqlQuery,
  hasSelectedEsqlQuery,
  isIndexPickerSourceSelected,
  toAiIndexSources,
  toEsqlSource,
  toSelectedSources,
} from './sources';

describe('sources utils', () => {
  describe('toAiIndexSources', () => {
    it('maps ES|QL and connector selections to stored sources', () => {
      const selected: SelectedSource[] = [
        { type: 'esql', value: 'FROM logs-*' },
        { type: 'connector', value: 'connector-1' },
      ];

      expect(toAiIndexSources(selected)).toEqual([
        { type: 'esql', value: 'FROM logs-*' },
        { type: 'connector', value: 'connector-1' },
      ]);
    });
  });

  describe('toSelectedSources', () => {
    it('rebuilds selected sources from stored AI index sources', () => {
      expect(
        toSelectedSources([
          { type: 'esql', value: 'FROM logs-*' },
          { type: 'connector', value: 'connector-1' },
        ])
      ).toEqual([
        { type: 'esql', value: 'FROM logs-*' },
        { type: 'connector', value: 'connector-1' },
      ]);
    });
  });

  describe('toEsqlSource', () => {
    it('builds an ES|QL selected source from a query string', () => {
      expect(toEsqlSource('FROM logs-*')).toEqual({ type: 'esql', value: 'FROM logs-*' });
    });
  });

  describe('createIndexEsqlQuery', () => {
    it('builds a FROM query for the given index or data stream', () => {
      expect(createIndexEsqlQuery('logs-*')).toBe('FROM logs-*');
      expect(createIndexEsqlQuery('.ds-logs-default')).toBe('FROM .ds-logs-default');
    });
  });

  describe('hasSelectedEsqlQuery', () => {
    const selected: SelectedSource[] = [{ type: 'esql', value: 'FROM logs-*' }];

    it('returns true when the exact ES|QL query is already selected', () => {
      expect(hasSelectedEsqlQuery(selected, 'FROM logs-*')).toBe(true);
    });

    it('returns false for a different ES|QL query', () => {
      expect(hasSelectedEsqlQuery(selected, 'FROM metrics-*')).toBe(false);
    });
  });

  describe('isIndexPickerSourceSelected', () => {
    it('returns true for an index that has a simple FROM source', () => {
      const selected: SelectedSource[] = [{ type: 'esql', value: 'FROM logs-*' }];
      expect(isIndexPickerSourceSelected(selected, 'logs-*')).toBe(true);
    });

    it('returns false when only a custom ES|QL query is selected', () => {
      const selected: SelectedSource[] = [{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }];
      expect(isIndexPickerSourceSelected(selected, 'logs-*')).toBe(false);
    });
  });
});
