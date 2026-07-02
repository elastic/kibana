/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { computeRouteValidate } from './compute_route_validate';

type ComputedValidate = Exclude<ReturnType<typeof computeRouteValidate>, false>;

describe('computeRouteValidate', () => {
  it('returns false when no schemas are declared', () => {
    expect(computeRouteValidate({})).toBe(false);
  });

  it('returns false when only an empty `request` is declared', () => {
    expect(computeRouteValidate({ request: {} })).toBe(false);
  });

  it('defines a value in each declared request slot', () => {
    const validate = computeRouteValidate({
      request: {
        params: z.object({ id: z.string() }),
        query: z.object({ page: z.number().optional() }),
        body: z.object({ name: z.string() }),
      },
    }) as ComputedValidate;

    expect(validate.request.params).toBeDefined();
    expect(validate.request.query).toBeDefined();
    expect(validate.request.body).toBeDefined();
  });

  it('leaves undeclared request slots empty', () => {
    const validate = computeRouteValidate({
      request: { body: z.object({ name: z.string() }) },
    }) as ComputedValidate;

    expect(validate.request.params).toBeUndefined();
    expect(validate.request.query).toBeUndefined();
    expect(validate.request.body).toBeDefined();
  });

  it('passes the declared response schemas through unchanged', () => {
    const responseSchemas = { 200: { description: 'OK' } };
    const validate = computeRouteValidate({ response: responseSchemas }) as ComputedValidate;

    expect(validate.response).toEqual(responseSchemas);
  });

  it('emits an empty request key when only response schemas are declared', () => {
    const validate = computeRouteValidate({
      response: { 200: { description: 'OK' } },
    }) as ComputedValidate;

    expect(validate.request).toEqual({});
  });
});
