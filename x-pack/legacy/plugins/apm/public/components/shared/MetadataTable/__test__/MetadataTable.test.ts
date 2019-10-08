/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reduceItemWithProperties } from '..';

describe('MetadataTable', () => {
  describe('reduceItemWithProperties', () => {
    const item = {
      id: '123',
      foo: {
        bar: 'bar'
      },
      bar: 'bar'
    };
    it('returns only the properties listed', () => {
      const properties = ['id', 'bar'];
      const data = reduceItemWithProperties(item, properties);
      expect(data).toStrictEqual({
        id: '123',
        bar: 'bar'
      });
    });
    it('returns property with nested value', () => {
      const properties = ['foo'];
      const data = reduceItemWithProperties(item, properties);
      expect(data).toStrictEqual({
        foo: {
          bar: 'bar'
        }
      });
    });
    it('does not return undefined value', () => {
      const _item = {
        id: '123',
        foo: undefined
      };
      const properties = ['id', 'foo'];
      const data = reduceItemWithProperties(_item, properties);
      expect(data).toStrictEqual({
        id: '123'
      });
    });
    it('returns empty object if any property is provided', () => {
      const _item = {
        id: '123',
        foo: undefined
      };
      const data = reduceItemWithProperties(_item, []);
      expect(data).toStrictEqual({});
    });
    it('returns empty object if any item is provided', () => {
      const properties = ['id'];
      const data = reduceItemWithProperties({}, properties);
      expect(data).toStrictEqual({});
    });
  });
});
