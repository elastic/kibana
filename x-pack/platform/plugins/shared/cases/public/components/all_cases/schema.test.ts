/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import { DEFAULT_CASES_TABLE_STATE } from '../../containers/constants';
import { AllCasesURLQueryParamsSchema, validateSchema } from './schema';

describe('Schema', () => {
  const supportedFilterOptions = pick(DEFAULT_CASES_TABLE_STATE.filterOptions, [
    'search',
    'severity',
    'status',
    'tags',
    'assignees',
    'category',
    'from',
    'to',
  ]);

  const defaultState = {
    ...supportedFilterOptions,
    ...DEFAULT_CASES_TABLE_STATE.queryParams,
  };

  describe('AllCasesURLQueryParamsSchema', () => {
    it('parses correctly with defaults', () => {
      const result = AllCasesURLQueryParamsSchema.safeParse(defaultState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(defaultState);
      }
    });

    it('parses correctly with values', () => {
      const state = {
        assignees: ['elastic'],
        tags: ['a', 'b'],
        category: ['my category'],
        status: ['open'],
        search: 'My title',
        severity: ['high'],
        customFields: { my_field: ['one', 'two'] },
        from: 'now-30d',
        to: 'now',
        sortOrder: 'asc',
        sortField: 'updatedAt',
        page: 5,
        perPage: 20,
      };

      const result = AllCasesURLQueryParamsSchema.safeParse(state);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(state);
      }
    });

    it('does not throw when missing fields', () => {
      for (const [key] of Object.entries(defaultState)) {
        const stateWithoutKey = omit(defaultState, key);
        const result = AllCasesURLQueryParamsSchema.safeParse(stateWithoutKey);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(stateWithoutKey);
        }
      }
    });

    it('strips unknown properties', () => {
      const result = AllCasesURLQueryParamsSchema.safeParse({ page: 10, foo: 'bar' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 10 });
      }
    });

    it.each(['status', 'severity', 'sortOrder', 'sortField', 'page', 'perPage'])(
      'fails if %s has invalid value',
      (key) => {
        const result = AllCasesURLQueryParamsSchema.safeParse({ [key]: 'foo' });
        expect(result.success).toBe(false);
      }
    );
  });

  describe('validateSchema', () => {
    it('validates schema correctly', () => {
      const params = validateSchema(defaultState, AllCasesURLQueryParamsSchema);
      expect(params).toEqual(defaultState);
    });

    it('returns null if the schema is not valid', () => {
      const params = validateSchema({ severity: 'foo' }, AllCasesURLQueryParamsSchema);
      expect(params).toEqual(null);
    });
  });
});
