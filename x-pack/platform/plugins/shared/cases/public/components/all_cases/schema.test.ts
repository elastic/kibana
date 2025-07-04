/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { omit, pick } from 'lodash';
import { DEFAULT_CASES_TABLE_STATE } from '../../containers/constants';
import { AllCasesURLQueryParamsRt, validateSchema } from './schema';

describe('Schema', () => {
  const supportedFilterOptions = pick(DEFAULT_CASES_TABLE_STATE.filterOptions, [
    'search',
    'severity',
    'status',
    'tags',
    'assignees',
    'category',
  ]);

  const defaultState = {
    ...supportedFilterOptions,
    ...DEFAULT_CASES_TABLE_STATE.queryParams,
  };

  describe('AllCasesURLQueryParamsRt', () => {
    it('decodes correctly with defaults', () => {
      const [params, errors] = validateNonExact(defaultState, AllCasesURLQueryParamsRt);

      expect(params).toEqual(defaultState);
      expect(errors).toEqual(null);
    });

    it('decodes correctly with values', () => {
      const state = {
        assignees: ['elastic'],
        tags: ['a', 'b'],
        category: ['my category'],
        status: ['open'],
        search: 'My title',
        severity: ['high'],
        customFields: { my_field: ['one', 'two'] },
        sortOrder: 'asc',
        sortField: 'updatedAt',
        page: 5,
        perPage: 20,
      };

      const [params, errors] = validateNonExact(state, AllCasesURLQueryParamsRt);

      expect(params).toEqual(state);
      expect(errors).toEqual(null);
    });

    it('does not throws an error when missing fields', () => {
      for (const [key] of Object.entries(defaultState)) {
        const stateWithoutKey = omit(defaultState, key);
        const [params, errors] = validateNonExact(stateWithoutKey, AllCasesURLQueryParamsRt);

        expect(params).toEqual(stateWithoutKey);
        expect(errors).toEqual(null);
      }
    });

    it('removes unknown properties', () => {
      const [params, errors] = validateNonExact({ page: 10, foo: 'bar' }, AllCasesURLQueryParamsRt);

      expect(params).toEqual({ page: 10 });
      expect(errors).toEqual(null);
    });

    it.each(['status', 'severity', 'sortOrder', 'sortField', 'page', 'perPage'])(
      'throws if %s has invalid value',
      (key) => {
        const [params, errors] = validateNonExact({ [key]: 'foo' }, AllCasesURLQueryParamsRt);

        expect(params).toEqual(null);
        expect(errors).toEqual(`Invalid value "foo" supplied to "${key}"`);
      }
    );
  });

  describe('validateSchema', () => {
    it('validates schema correctly', () => {
      const params = validateSchema(defaultState, AllCasesURLQueryParamsRt);
      expect(params).toEqual(defaultState);
    });

    it('throws an error if the schema is not valid', () => {
      const params = validateSchema({ severity: 'foo' }, AllCasesURLQueryParamsRt);
      expect(params).toEqual(null);
    });
  });
});
