/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES } from '@kbn/management-settings-ids';
import {
  parseLinkedCodeIndices,
  readLinkedCodeIndex,
  upsertLinkedCodeIndex,
  writeLinkedCodeIndex,
} from './linked_code_index_storage';

describe('linked_code_index_storage', () => {
  describe('parseLinkedCodeIndices', () => {
    it('parses valid JSON strings and objects', () => {
      expect(parseLinkedCodeIndices('{"logs.a":"code-a"}')).toEqual({ 'logs.a': 'code-a' });
      expect(parseLinkedCodeIndices({ 'logs.a': 'code-a' })).toEqual({ 'logs.a': 'code-a' });
    });

    it('drops non-string/empty values and tolerates invalid input', () => {
      expect(parseLinkedCodeIndices('{"a":"x","b":1,"c":""}')).toEqual({ a: 'x' });
      expect(parseLinkedCodeIndices('not json')).toEqual({});
      expect(parseLinkedCodeIndices(['a'])).toEqual({});
      expect(parseLinkedCodeIndices(undefined)).toEqual({});
    });
  });

  describe('upsertLinkedCodeIndex', () => {
    it('adds an entry without touching others', () => {
      const raw = '{"logs.other":"code-other"}';
      expect(JSON.parse(upsertLinkedCodeIndex(raw, 'logs.a', 'code-a'))).toEqual({
        'logs.other': 'code-other',
        'logs.a': 'code-a',
      });
    });

    it('trims the value', () => {
      expect(JSON.parse(upsertLinkedCodeIndex('{}', 'logs.a', '  code-a  '))).toEqual({
        'logs.a': 'code-a',
      });
    });

    it('removes the entry when the value is empty', () => {
      const raw = '{"logs.a":"code-a","logs.b":"code-b"}';
      expect(JSON.parse(upsertLinkedCodeIndex(raw, 'logs.a', '   '))).toEqual({
        'logs.b': 'code-b',
      });
    });
  });

  describe('client helpers', () => {
    const makeClient = (raw: unknown) =>
      ({
        get: jest.fn().mockReturnValue(raw),
        set: jest.fn().mockResolvedValue(undefined),
      } as unknown as IUiSettingsClient);

    it('readLinkedCodeIndex returns the entry or empty string', () => {
      expect(readLinkedCodeIndex(makeClient('{"logs.a":"code-a"}'), 'logs.a')).toBe('code-a');
      expect(readLinkedCodeIndex(makeClient('{}'), 'logs.a')).toBe('');
    });

    it('writeLinkedCodeIndex persists a merged map', async () => {
      const client = makeClient('{"logs.other":"code-other"}');
      await writeLinkedCodeIndex(client, 'logs.a', 'code-a');
      expect(client.set).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES,
        JSON.stringify({ 'logs.other': 'code-other', 'logs.a': 'code-a' })
      );
    });
  });
});
