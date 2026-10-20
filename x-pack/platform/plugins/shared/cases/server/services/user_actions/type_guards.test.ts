/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAssigneesArray, isCaseTemplate, isStringArray } from './type_guards';

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

  describe('isCaseTemplate', () => {
    it('returns true for a valid template reference', () => {
      expect(isCaseTemplate({ id: 'tmpl-1', version: 3 })).toBeTruthy();
    });

    it('returns false when version is missing', () => {
      expect(isCaseTemplate({ id: 'tmpl-1' })).toBeFalsy();
    });

    it('returns false when version is not a number', () => {
      expect(isCaseTemplate({ id: 'tmpl-1', version: '3' })).toBeFalsy();
    });

    it('returns false for null', () => {
      expect(isCaseTemplate(null)).toBeFalsy();
    });

    it('returns false for a non-object value', () => {
      expect(isCaseTemplate('tmpl-1')).toBeFalsy();
    });
  });
});
