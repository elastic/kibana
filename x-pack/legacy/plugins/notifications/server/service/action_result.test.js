/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionResult } from './action_result';

describe('ActionResult', () => {

  const message = 'this is a message';
  const response = { other: { side: { response: true } } };
  const error = { message: `Error: ${message}` };

  const okResult = new ActionResult({ message, response });
  const notOkResult = new ActionResult({ message, response, error });

  test('getError returns supplied error or undefined', () => {
    expect(okResult.getError()).toBeUndefined();
    expect(notOkResult.getError()).toBe(error);
  });

  test('getMessage returns supplied message', () => {
    expect(okResult.getMessage()).toBe(message);
    expect(notOkResult.getMessage()).toBe(message);
  });

  test('getResponse returns supplied response', () => {
    expect(okResult.getResponse()).toBe(response);
    expect(notOkResult.getResponse()).toBe(response);
  });

  test('isOk returns based on having an error', () => {
    expect(okResult.isOk()).toBe(true);
    expect(notOkResult.isOk()).toBe(false);
  });

  test('toJson', () => {
    expect(okResult.toJson()).toEqual({
      ok: true,
      error: undefined,
      message,
      response,
    });

    expect(notOkResult.toJson()).toEqual({
      ok: false,
      error,
      message,
      response,
    });
  });

});
