/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_SNAPSHOT_LIST_PARAMS,
  escapeString,
  getQueryFromListParams,
} from './snapshot_list_params';

describe('Snapshot list params', () => {
  describe('escapeString', () => {
    it('should escape special characters', () => {
      expect(escapeString('(special)[]{chars}')).toBe('\\(special\\)[]\\{chars\\}');
    });

    it('should unescape escaped characters before escape it ', () => {
      expect(escapeString('\\(special\\)[]\\{chars\\}')).toBe('\\(special\\)[]\\{chars\\}');
    });

    it('should handle strings without special characters', () => {
      expect(escapeString('no special chars')).toBe('no special chars');
    });
  });

  describe('getQueryFromListParams', () => {
    const schema = {};

    it('should parse the query', () => {
      const listParams = {
        ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        searchField: 'field',
        searchValue: 'value',
      };

      expect(getQueryFromListParams(listParams, schema).text).toBe('field=value');
    });

    it('should parse the query and escape special characters', () => {
      const listParams = {
        ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        searchField: 'field',
        searchValue: '(val)ue',
      };

      expect(getQueryFromListParams(listParams, schema).text).toBe('field=\\(val\\)ue');
    });
  });
});
