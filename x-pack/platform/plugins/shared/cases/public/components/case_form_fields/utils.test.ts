/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEmptyTags, validateMaxLength, validateMaxTagsLength } from './utils';
import * as i18n from './translations';

describe('utils', () => {
  describe('validateEmptyTags', () => {
    const message = i18n.TAGS_EMPTY_ERROR;
    it('returns no error for non empty tags', () => {
      expect(validateEmptyTags({ value: ['coke', 'pepsi'], message })).toBeUndefined();
    });

    it('returns no error for non empty tag', () => {
      expect(validateEmptyTags({ value: 'coke', message })).toBeUndefined();
    });

    it('returns error for empty tags', () => {
      expect(validateEmptyTags({ value: [' ', 'pepsi'], message })).toEqual({ message });
    });

    it('returns error for empty tag', () => {
      expect(validateEmptyTags({ value: ' ', message })).toEqual({ message });
    });
  });

  describe('validateMaxLength', () => {
    const limit = 5;
    const message = i18n.MAX_LENGTH_ERROR('tag', limit);

    it('returns error for tags exceeding length', () => {
      expect(
        validateMaxLength({
          value: ['coke', 'pepsi!'],
          message,
          limit,
        })
      ).toEqual({ message });
    });

    it('returns error for tag exceeding length', () => {
      expect(
        validateMaxLength({
          value: 'Hello!',
          message,
          limit,
        })
      ).toEqual({ message });
    });

    it('returns no error for tags not exceeding length', () => {
      expect(
        validateMaxLength({
          value: ['coke', 'pepsi'],
          message,
          limit,
        })
      ).toBeUndefined();
    });

    it('returns no error for tag not exceeding length', () => {
      expect(
        validateMaxLength({
          value: 'Hello',
          message,
          limit,
        })
      ).toBeUndefined();
    });
  });

  describe('validateMaxTagsLength', () => {
    const limit = 2;
    const message = i18n.MAX_TAGS_ERROR(limit);

    it('returns error when tags exceed length', () => {
      expect(validateMaxTagsLength({ value: ['coke', 'pepsi', 'fanta'], message, limit })).toEqual({
        message,
      });
    });

    it('returns no error when tags do not exceed length', () => {
      expect(validateMaxTagsLength({ value: ['coke', 'pepsi'], message, limit })).toBeUndefined();
    });
  });
});
