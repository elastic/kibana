/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorMessage } from './get_error_message';

const fetchError = (statusText: string, body?: unknown) =>
  Object.assign(new Error(statusText), { request: {}, body });

describe('getErrorMessage', () => {
  it('reads what the route said over the status text', () => {
    expect(
      getErrorMessage(
        fetchError('Conflict', {
          statusCode: 409,
          message: 'Dataset with name "Golden set" exists',
        })
      )
    ).toBe('Dataset with name "Golden set" exists');
  });

  it('falls back to the status text when the response carried no message', () => {
    expect(getErrorMessage(fetchError('Forbidden'))).toBe('Forbidden');
    expect(getErrorMessage(fetchError('Bad Gateway', 'upstream said no'))).toBe('Bad Gateway');
    expect(getErrorMessage(fetchError('Conflict', { statusCode: 409, message: '' }))).toBe(
      'Conflict'
    );
  });

  it('leaves errors raised in the browser as they are, unprefixed', () => {
    expect(getErrorMessage(new Error('Input must be a JSON object.'))).toBe(
      'Input must be a JSON object.'
    );
    expect(getErrorMessage('something else entirely')).toBe('something else entirely');
  });
});
