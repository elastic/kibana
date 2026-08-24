/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isEsqlUnknownColumnError } from './esql_errors';

const responseError = ({
  statusCode = 400,
  type = 'verification_exception',
  reason = 'Unknown column [attributes.excluded]',
}: { statusCode?: number; type?: string; reason?: string } = {}) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type, reason } },
    headers: {},
    warnings: null,
    meta: {} as never,
  });

describe('isEsqlUnknownColumnError', () => {
  it('recognizes the 400 a query naming an unmapped column gets', () => {
    expect(isEsqlUnknownColumnError(responseError())).toBe(true);
  });

  it('rejects a verification failure about something other than a column', () => {
    expect(
      isEsqlUnknownColumnError(responseError({ reason: 'Unknown function [FIELD_EXTRACT]' }))
    ).toBe(false);
  });

  it('rejects another kind of 400', () => {
    expect(isEsqlUnknownColumnError(responseError({ type: 'parsing_exception' }))).toBe(false);
  });

  it('rejects the same body reported with a different status', () => {
    expect(isEsqlUnknownColumnError(responseError({ statusCode: 500 }))).toBe(false);
  });

  it('rejects errors that are not Elasticsearch responses at all', () => {
    expect(isEsqlUnknownColumnError(new Error('Unknown column [x]'))).toBe(false);
    expect(isEsqlUnknownColumnError(undefined)).toBe(false);
  });
});
