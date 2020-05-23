/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { emptyFilter } from './__tests__/fixtures/test_filters';
import { exactly } from './exactly';

describe('exactly', () => {
  const fn = functionWrapper(exactly);

  it('returns a filter', () => {
    const args = { column: 'name', value: 'product2' };
    expect(fn(emptyFilter, args)).toHaveProperty('type', 'filter');
  });

  it("adds an exactly object to 'and'", () => {
    const result = fn(emptyFilter, { column: 'name', value: 'product2' });
    expect(result.and[0]).toHaveProperty('filterType', 'exactly');
  });

  describe('args', () => {
    describe('column', () => {
      it('sets the column to apply the filter to', () => {
        const result = fn(emptyFilter, { column: 'name' });
        expect(result.and[0]).toHaveProperty('column', 'name');
      });
    });

    describe('value', () => {
      it('sets the exact value to filter on in a column', () => {
        const result = fn(emptyFilter, { value: 'product2' });
        expect(result.and[0]).toHaveProperty('value', 'product2');
      });
    });
  });
});
