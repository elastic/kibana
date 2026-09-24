/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectedSource } from '../components/source_picker';
import {
  areSourceSelectionsEqual,
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
