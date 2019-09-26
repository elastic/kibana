/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { emptyEntity, multipleEntities, getMultipleEntities } from './entity_helpers';

describe('entity_helpers', () => {
  describe('#emptyEntity', () => {
    test('returns empty entity if the string is empty', () => {
      expect(emptyEntity('')).toEqual(true);
    });

    test('returns empty entity if the string is blank spaces', () => {
      expect(emptyEntity('    ')).toEqual(true);
    });

    test('returns empty entity if is an entity that starts and ends with a $', () => {
      expect(emptyEntity('$host.name$')).toEqual(true);
    });
  });

  describe('#multipleEntities', () => {
    test('returns multiple entities if they are a separated string and there are two', () => {
      expect(multipleEntities('a,b')).toEqual(true);
    });

    test('returns multiple entities if they are a separated string and there are three', () => {
      expect(multipleEntities('a,b,c')).toEqual(true);
    });

    test('returns false for multiple entities if they are a single string', () => {
      expect(multipleEntities('a')).toEqual(false);
    });
  });

  describe('#getMultipleEntities', () => {
    test('returns multiple entities if they are a separated string and there are two', () => {
      expect(getMultipleEntities('a,b')).toEqual(['a', 'b']);
    });

    test('returns single entity', () => {
      expect(getMultipleEntities('a')).toEqual(['a']);
    });

    test('returns empty entity', () => {
      expect(getMultipleEntities('')).toEqual(['']);
    });
  });
});
