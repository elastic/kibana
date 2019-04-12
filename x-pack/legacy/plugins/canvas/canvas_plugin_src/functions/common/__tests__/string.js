/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { string } from '../string';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('string', () => {
  const fn = functionWrapper(string);

  it('casts primitive types to strings', () => {
    expect(fn(null, { value: [14000] })).to.be('14000');
    expect(fn(null, { value: ['foo'] })).to.be('foo');
    expect(fn(null, { value: [null] })).to.be('');
    expect(fn(null, { value: [true] })).to.be('true');
  });

  it('concatenates all args to one string', () => {
    expect(fn(null, { value: ['foo', 'bar', 'fizz', 'buzz'] })).to.be('foobarfizzbuzz');
    expect(fn(null, { value: ['foo', 1, true, null] })).to.be('foo1true');
  });
});
