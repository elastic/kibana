/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { all } from '../all';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('all', () => {
  const fn = functionWrapper(all);

  it('should return true with no conditions', () => {
    expect(fn(null, {})).to.be(true);
    expect(fn(null, { condition: [] })).to.be(true);
  });

  it('should return true when all conditions are true', () => {
    expect(fn(null, { condition: [true] })).to.be(true);
    expect(fn(null, { condition: [true, true, true] })).to.be(true);
  });

  it('should return true when all conditions are truthy', () => {
    expect(fn(null, { condition: [true, 1, 'hooray', {}] })).to.be(true);
  });

  it('should return false when at least one condition is false', () => {
    expect(fn(null, { condition: [false, true, true] })).to.be(false);
    expect(fn(null, { condition: [false, false, true] })).to.be(false);
    expect(fn(null, { condition: [false, false, false] })).to.be(false);
  });

  it('should return false when at least one condition is falsy', () => {
    expect(fn(null, { condition: [true, 0, 'hooray', {}] })).to.be(false);
    expect(fn(null, { condition: [true, 1, 'hooray', null] })).to.be(false);
    expect(fn(null, { condition: [true, 1, '', {}] })).to.be(false);
  });
});
