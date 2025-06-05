/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlattenRecord } from '@kbn/streams-schema';
import { getDefaultFormStateByType } from './utils';
import { ALWAYS_CONDITION } from '../../../util/condition';
import { DraftGrokExpression, GrokCollection } from '@kbn/grok-ui';
import { omit } from 'lodash';

let grokCollection: GrokCollection;

describe('utils', () => {
  beforeAll(async () => {
    grokCollection = new GrokCollection();
    await grokCollection.setup();
  });
  describe('defaultGrokProcessorFormState', () => {
    it('should return default form state with empty field when no well known text fields are present', () => {
      const sampleDocs: FlattenRecord[] = [
        {
          'unknown.field': 'some value',
          'another.field': 'another value',
        },
        {
          'random.field': 'random value',
        },
      ];

      const result = getDefaultFormStateByType('grok', sampleDocs, { grokCollection });

      expect(omit(result, 'patterns')).toEqual({
        type: 'grok',
        field: '',
        pattern_definitions: {},
        ignore_failure: true,
        ignore_missing: true,
        if: ALWAYS_CONDITION,
      });

      if ('patterns' in result) {
        expect(result.patterns[0]).toBeInstanceOf(DraftGrokExpression);
        expect(result.patterns[0].getExpression()).toEqual('');
      } else {
        throw new Error('Result does not contain patterns');
      }
    });

    it('should select the only well known text field present', () => {
      const sampleDocs: FlattenRecord[] = [
        {
          'error.message': 'This is an error',
          'another.field': 'another value',
        },
        {
          'error.message': 'Another error',
          'random.field': 'random value',
        },
      ];

      const result = getDefaultFormStateByType('grok', sampleDocs, { grokCollection });

      expect(omit(result, 'patterns')).toEqual({
        type: 'grok',
        field: 'error.message',
        pattern_definitions: {},
        ignore_failure: true,
        ignore_missing: true,
        if: ALWAYS_CONDITION,
      });

      if ('patterns' in result) {
        expect(result.patterns[0]).toBeInstanceOf(DraftGrokExpression);
        expect(result.patterns[0].getExpression()).toEqual('');
      } else {
        throw new Error('Result does not contain patterns');
      }
    });

    it('should select the most common well known text field when multiple are present', () => {
      const sampleDocs: FlattenRecord[] = [
        {
          message: 'Log message 1',
          'error.message': 'Error message 1',
        },
        {
          message: 'Log message 2',
          'error.message': 'Error message 2',
        },
        {
          'error.message': 'Error message 3',
        },
      ];

      const result = getDefaultFormStateByType('grok', sampleDocs, { grokCollection });

      expect(omit(result, 'patterns')).toEqual({
        type: 'grok',
        field: 'error.message', // 'error.message' appears 3 times vs 'message' 2 times
        pattern_definitions: {},
        ignore_failure: true,
        ignore_missing: true,
        if: ALWAYS_CONDITION,
      });

      if ('patterns' in result) {
        expect(result.patterns[0]).toBeInstanceOf(DraftGrokExpression);
        expect(result.patterns[0].getExpression()).toEqual('');
      } else {
        throw new Error('Result does not contain patterns');
      }
    });

    it('should select based on WELL_KNOWN_TEXT_FIELDS order when frequencies are equal', () => {
      const sampleDocs: FlattenRecord[] = [
        {
          message: 'Log message 1',
          'error.message': 'Error message 1',
          'event.original': 'Original event 1',
        },
        {
          message: 'Log message 2',
          'error.message': 'Error message 2',
          'event.original': 'Original event 2',
        },
      ];

      const result = getDefaultFormStateByType('grok', sampleDocs, { grokCollection });

      // In WELL_KNOWN_TEXT_FIELDS, 'message' comes before 'error.message' and 'event.original'
      expect(omit(result, 'patterns')).toEqual({
        type: 'grok',
        field: 'message',
        pattern_definitions: {},
        ignore_failure: true,
        ignore_missing: true,
        if: ALWAYS_CONDITION,
      });

      if ('patterns' in result) {
        expect(result.patterns[0]).toBeInstanceOf(DraftGrokExpression);
        expect(result.patterns[0].getExpression()).toEqual('');
      } else {
        throw new Error('Result does not contain patterns');
      }
    });
  });
});
