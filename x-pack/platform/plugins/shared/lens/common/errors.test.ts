/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ERROR_CODES, LENS_ERROR_TYPE } from '@kbn/lens-embeddable-utils';
import { getLensErrorCode } from './errors';

const httpError = (body: unknown) => Object.assign(new Error('http error'), { body });

describe('getLensErrorCode', () => {
  it.each(Object.values(LENS_ERROR_CODES))('reads the "%s" code from the response body', (code) => {
    expect(getLensErrorCode(httpError({ attributes: { type: LENS_ERROR_TYPE, code } }))).toBe(code);
  });

  it.each([
    ['a plain error', new Error('boom')],
    ['a non-object', 'boom'],
    ['null', null],
    ['a body without attributes', httpError({ message: 'boom' })],
    ['attributes without a code', httpError({ attributes: { type: LENS_ERROR_TYPE } })],
    ['a non-string code', httpError({ attributes: { type: LENS_ERROR_TYPE, code: 42 } })],
    [
      'an unknown code',
      httpError({ attributes: { type: LENS_ERROR_TYPE, code: 'not_a_lens_code' } }),
    ],
    [
      'attributes that are not from Lens',
      httpError({ attributes: { code: LENS_ERROR_CODES.DATASOURCE_NOT_FOUND } }),
    ],
  ])('returns undefined for %s', (_, error) => {
    expect(getLensErrorCode(error)).toBeUndefined();
  });
});
