/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectedSource } from '../components/source_picker';
import {
  areSourceSelectionsEqual,
  createIndexEsqlQuery,
  hasSelectedEsqlQuery,
  isIndexPickerSourceSelected,
  toAiIndexSources,
  toSelectedSources,
  toSourceType,
} from './sources';

describe('sources utils', () => {
  describe('toAiIndexSources', () => {
    it('maps ES|QL and connector selections to stored sources', () => {
      const selected: SelectedSource[] = [
        { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
        { type: 'connector', id: 'connector-1', label: 'Jira Cloud', value: 'connector-1' },
      ];

      expect(toAiIndexSources(selected)).toEqual([
        { type: 'esql', value: 'FROM logs-*' },
        { type: 'connector', value: 'connector-1' },
      ]);
    });
  });

  describe('toSelectedSources', () => {
    it('restores connector sources with the id as a placeholder label', () => {
      expect(
        toSelectedSources([
          { type: 'esql', value: 'FROM logs-*' },
          { type: 'connector', value: 'connector-1' },
        ])
      ).toEqual([
        { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
        { type: 'connector', id: 'connector-1', label: 'connector-1', value: 'connector-1' },
      ]);
    });
  });

  describe('toSourceType', () => {
    it('maps stored source types to UI source types', () => {
      expect(toSourceType('esql')).toBe('esql');
      expect(toSourceType('connector')).toBe('connector');
    });
  });

  describe('createIndexEsqlQuery', () => {
    it('builds a FROM query for the given index or data stream', () => {
      expect(createIndexEsqlQuery('logs-*')).toBe('FROM logs-*');
      expect(createIndexEsqlQuery('.ds-logs-default')).toBe('FROM .ds-logs-default');
    });
  });

  describe('hasSelectedEsqlQuery', () => {
    const selected: SelectedSource[] = [
      { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
    ];

    it('returns true when the exact ES|QL query is already selected', () => {
      expect(hasSelectedEsqlQuery(selected, 'FROM logs-*')).toBe(true);
    });

    it('returns false for a different ES|QL query', () => {
      expect(hasSelectedEsqlQuery(selected, 'FROM metrics-*')).toBe(false);
    });
  });

  describe('isIndexPickerSourceSelected', () => {
    it('returns true for an index that has a simple FROM source', () => {
      const selected: SelectedSource[] = [
        { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
      ];
      expect(isIndexPickerSourceSelected(selected, 'logs-*')).toBe(true);
    });

    it('returns false when only a custom ES|QL query is selected', () => {
      const selected: SelectedSource[] = [
        {
          type: 'esql',
          id: 'FROM logs-* | LIMIT 10',
          label: 'FROM logs-* | LIMIT 10',
          value: 'FROM logs-* | LIMIT 10',
        },
      ];
      expect(isIndexPickerSourceSelected(selected, 'logs-*')).toBe(false);
    });
  });

  describe('areSourceSelectionsEqual', () => {
    const esqlSource: SelectedSource = {
      type: 'esql',
      id: 'FROM logs-*',
      label: 'FROM logs-*',
      value: 'FROM logs-*',
    };
    const connectorSource: SelectedSource = {
      type: 'connector',
      id: 'connector-1',
      label: 'Jira Cloud',
      value: 'connector-1',
    };

    it('returns true for identical selections', () => {
      expect(areSourceSelectionsEqual([esqlSource], [esqlSource])).toBe(true);
    });

    it('returns true regardless of order', () => {
      expect(
        areSourceSelectionsEqual([esqlSource, connectorSource], [connectorSource, esqlSource])
      ).toBe(true);
    });

    it('ignores id and label differences when type and value match', () => {
      expect(
        areSourceSelectionsEqual(
          [connectorSource],
          [{ type: 'connector', id: 'connector-1', label: 'connector-1', value: 'connector-1' }]
        )
      ).toBe(true);
    });

    it('returns false when selections differ', () => {
      expect(areSourceSelectionsEqual([esqlSource], [connectorSource])).toBe(false);
      expect(areSourceSelectionsEqual([esqlSource], [])).toBe(false);
    });
  });
});
