/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteValidationResultFactory } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { buildAlertingRouteValidation, ZodRequestValidationError } from './zod_request_validation';

const schema = z.object({ name: z.string(), age: z.number() });

const ok = jest.fn().mockImplementation((value) => ({ value }));
const badRequest = jest.fn().mockImplementation((error) => ({ error }));
const validationResult: RouteValidationResultFactory = { ok, badRequest };

describe('buildAlertingRouteValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the parsed value when the input matches the schema', () => {
    const validate = buildAlertingRouteValidation(schema);

    validate({ name: 'a', age: 1 }, validationResult);

    expect(ok).toHaveBeenCalledWith({ name: 'a', age: 1 });
    expect(badRequest).not.toHaveBeenCalled();
  });

  it('rejects with a ZodRequestValidationError carrying the issues', () => {
    const validate = buildAlertingRouteValidation(schema);

    validate({ age: 'not-a-number' }, validationResult);

    expect(ok).not.toHaveBeenCalled();

    const [error] = badRequest.mock.calls[0];
    expect(error).toBeInstanceOf(ZodRequestValidationError);
    expect((error as ZodRequestValidationError).zodError.issues.map(({ path }) => path)).toEqual([
      ['name'],
      ['age'],
    ]);
  });

  it('reports the same message as the shared zod route validation', () => {
    const validate = buildAlertingRouteValidation(schema);

    validate({ age: 'not-a-number' }, validationResult);

    const [error] = badRequest.mock.calls[0];
    expect((error as Error).message).toMatchInlineSnapshot(
      `"name: Invalid input: expected string, received undefined, age: Invalid input: expected number, received string"`
    );
  });

  it('exposes the schema as _sourceSchema so OAS generation still converts it', () => {
    const validate = buildAlertingRouteValidation(schema) as ReturnType<
      typeof buildAlertingRouteValidation
    > & { _sourceSchema: unknown };

    expect(validate._sourceSchema).toBe(schema);
  });
});
