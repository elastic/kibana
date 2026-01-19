/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeaderFieldType } from '../types';
import { toHeaderFields, toHeadersRecord } from './transform';

describe('transform utils', () => {
  describe('toHeaderFields', () => {
    it('should convert a record to header fields with the provided type', () => {
      const result = toHeaderFields({ foo: 'bar', baz: 'qux' }, HeaderFieldType.CONFIG);
      expect(result).toEqual([
        { key: 'foo', value: 'bar', type: HeaderFieldType.CONFIG },
        { key: 'baz', value: 'qux', type: HeaderFieldType.CONFIG },
      ]);
    });
  });

  describe('toHeadersRecord', () => {
    it('should convert header fields of the matching type to a record', () => {
      const headers = [
        { key: 'foo', value: 'bar', type: HeaderFieldType.CONFIG },
        { key: 'secret', value: 'baz', type: HeaderFieldType.SECRET },
      ];

      expect(toHeadersRecord(headers, HeaderFieldType.CONFIG)).toEqual({ foo: 'bar' });
      expect(toHeadersRecord(headers, HeaderFieldType.SECRET)).toEqual({ secret: 'baz' });
    });

    it('should ignore headers with empty keys or mismatched types', () => {
      const headers = [
        { key: '', value: 'bar', type: HeaderFieldType.CONFIG },
        { key: 'secret', value: 'baz', type: HeaderFieldType.SECRET },
      ];

      expect(toHeadersRecord(headers, HeaderFieldType.CONFIG)).toEqual({});
      expect(toHeadersRecord(headers, HeaderFieldType.SECRET)).toEqual({ secret: 'baz' });
    });
  });
});
