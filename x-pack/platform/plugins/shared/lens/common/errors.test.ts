/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ERROR_CODES } from '@kbn/lens-embeddable-utils';
import { getLensErrorCode } from './errors';

const httpError = (body: unknown) => Object.assign(new Error('http error'), { body });

describe('getLensErrorCode', () => {
  it.each(Object.values(LENS_ERROR_CODES))('reads the "%s" code from the response body', (code) => {
    expect(getLensErrorCode(httpError({ attributes: { code } }))).toBe(code);
  });

  it.each([
    ['a plain error', new Error('boom')],
    ['a non-object', 'boom'],
    ['null', null],
    ['a body without attributes', httpError({ message: 'boom' })],
    ['attributes without a code', httpError({ attributes: {} })],
    ['a non-string code', httpError({ attributes: { code: 42 } })],
    ['an unknown code', httpError({ attributes: { code: 'not_a_lens_code' } })],
  ])('returns undefined for %s', (_, error) => {
    expect(getLensErrorCode(error)).toBeUndefined();
  });
});
