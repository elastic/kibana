/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { computeRouteValidate } from './base_alerting_route';

describe('computeRouteValidate', () => {
  it('wraps each declared request schema with buildRouteValidationWithZod', () => {
    const validate = computeRouteValidate({
      request: {
        params: z.object({ id: z.string() }),
        query: z.object({ page: z.number().optional() }),
        body: z.object({ name: z.string() }),
      },
      response: { 200: { description: 'OK' } },
    });

    expect(validate).not.toBe(false);
    if (validate === false) return;

    expect(validate.request).toBeDefined();
    expect(typeof validate.request?.params).toBe('function');
    expect(typeof validate.request?.query).toBe('function');
    expect(typeof validate.request?.body).toBe('function');
  });

  it('exposes the declared response schemas unchanged', () => {
    const validate = computeRouteValidate({
      response: { 200: { description: 'OK' } },
    });

    if (validate === false) {
      throw new Error('expected validate to be an object');
    }

    expect(validate.response).toEqual({ 200: { description: 'OK' } });
  });

  it('returns false when no schemas are declared', () => {
    expect(computeRouteValidate({})).toBe(false);
  });

  it('returns false when only an empty `request` is declared', () => {
    expect(computeRouteValidate({ request: {} })).toBe(false);
  });

  it('only wraps schemas that were provided (no params if params absent)', () => {
    const validate = computeRouteValidate({
      request: { body: z.object({ name: z.string() }) },
    });

    if (validate === false) {
      throw new Error('expected validate to be an object');
    }

    expect(validate.request?.params).toBeUndefined();
    expect(validate.request?.query).toBeUndefined();
    expect(typeof validate.request?.body).toBe('function');
  });

  it('emits an empty request key when only response schemas are declared', () => {
    const validate = computeRouteValidate({
      response: { 200: { description: 'OK' } },
    });

    if (validate === false) {
      throw new Error('expected validate to be an object');
    }

    // Kibana's `RouteValidatorRequestAndResponses` requires `request` even
    // when no request fields are validated — we emit an empty object so
    // response-only routes still type-check.
    expect(validate.request).toEqual({});
    expect(validate.response).toBeDefined();
  });
});
