/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectedSource } from '../components/source_picker';
import { toAiIndexSources, toSelectedSources, toSourceType } from './sources';

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
});
