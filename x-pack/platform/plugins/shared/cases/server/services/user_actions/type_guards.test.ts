/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAssigneesArray, isStringArray } from './type_guards';

describe('type_guards', () => {
  describe('isStringArray', () => {
    it('returns true when the value is an empty array', () => {
      expect(isStringArray([])).toBeTruthy();
    });

    it('returns true when the value is an array of a single string', () => {
      expect(isStringArray(['a'])).toBeTruthy();
    });

    it('returns true when the value is an array of multiple strings', () => {
      expect(isStringArray(['a', 'b'])).toBeTruthy();
    });

    it('returns false when the value is an array of strings and numbers', () => {
      expect(isStringArray(['a', 1])).toBeFalsy();
    });

    it('returns false when the value is an array of strings and objects', () => {
      expect(isStringArray(['a', {}])).toBeFalsy();
    });
  });

  describe('isAssigneesArray', () => {
    it('returns true when the value is an empty array', () => {
      expect(isAssigneesArray([])).toBeTruthy();
    });

    it('returns false when the value is not an array of assignees', () => {
      expect(isAssigneesArray([{ a: '1' }])).toBeFalsy();
    });

    it('returns false when the value is an array of assignees and non assignee objects', () => {
      expect(isAssigneesArray([{ uid: '1' }, { hi: '2' }])).toBeFalsy();
    });

    it('returns true when the value is an array of a single assignee', () => {
      expect(isAssigneesArray([{ uid: '1' }])).toBeTruthy();
    });

    it('returns true when the value is an array of multiple assignees', () => {
      expect(isAssigneesArray([{ uid: 'a' }, { uid: 'b' }])).toBeTruthy();
    });

    it('returns false when the value is an array of assignees and numbers', () => {
      expect(isAssigneesArray([{ uid: 'a' }, 1])).toBeFalsy();
    });

    it('returns false when the value is an array of strings and objects', () => {
      expect(isAssigneesArray(['a', {}])).toBeFalsy();
    });
  });
});
