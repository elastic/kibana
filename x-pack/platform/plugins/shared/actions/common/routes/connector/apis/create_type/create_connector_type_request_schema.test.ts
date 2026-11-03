/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConnectorTypeRequestSchema,
  createConnectorTypeResponseSchema,
} from './schemas/latest';

const validRequest = {
  id: 'acme_orders',
  displayName: 'Acme Orders',
  description: 'Order API',
  config: [{ name: 'baseUrl', type: 'string' as const, required: true }],
  auth: { type: 'api_key_header' as const, headerName: 'X-API-Key' },
  actions: {
    getOrder: {
      description: 'Get an order',
      input: [{ name: 'orderId', type: 'string' as const, required: true }],
      request: {
        method: 'GET' as const,
        url: '{{config.baseUrl}}/orders/{{input.orderId}}',
        headers: { Accept: 'application/json', 'X-API-Key': '{{secrets.apiKey}}' },
      },
    },
  },
};

describe('createConnectorTypeRequestSchema', () => {
  it('accepts a valid connector type request and applies defaults', () => {
    const result = createConnectorTypeRequestSchema.parse(validRequest);
    expect(result.actions.getOrder.scope).toBe('write');
    expect(result.config[0].required).toBe(true);
  });

  it('does not accept a caller-supplied minimum license', () => {
    expect(
      createConnectorTypeRequestSchema.safeParse({
        ...validRequest,
        minimumLicense: 'basic',
      }).success
    ).toBe(false);
  });

  it.each(['.acme', '.Uppercase', 'bad.name', ''])('rejects an unsafe connector id: %s', (id) => {
    expect(createConnectorTypeRequestSchema.safeParse({ ...validRequest, id }).success).toBe(false);
  });

  it('rejects ids that would exceed the final dotted id limit', () => {
    expect(
      createConnectorTypeRequestSchema.safeParse({ ...validRequest, id: 'a'.repeat(128) }).success
    ).toBe(false);
  });

  it('requires the response id to include the dot prefix', () => {
    expect(createConnectorTypeResponseSchema.parse({ id: '.acme_orders' }).id).toBe('.acme_orders');
    expect(createConnectorTypeResponseSchema.safeParse({ id: 'acme_orders' }).success).toBe(false);
  });

  it('rejects unknown template roots and malformed template braces', () => {
    for (const url of [
      '{{env.secret}}',
      '{{config.bad-name}}',
      '{{config.baseUrl',
      '{{params.orderId}}',
    ]) {
      const result = createConnectorTypeRequestSchema.safeParse({
        ...validRequest,
        actions: {
          getOrder: {
            ...validRequest.actions.getOrder,
            request: { ...validRequest.actions.getOrder.request, url },
          },
        },
      });
      expect(result.success).toBe(false);
    }
  });

  it('checks template names against fields and the selected auth type', () => {
    const invalidTemplates = [
      '{{config.missing}}/orders/{{input.orderId}}',
      '{{config.baseUrl}}/orders/{{input.missing}}',
    ];
    for (const url of invalidTemplates) {
      const result = createConnectorTypeRequestSchema.safeParse({
        ...validRequest,
        actions: {
          getOrder: {
            ...validRequest.actions.getOrder,
            request: { ...validRequest.actions.getOrder.request, url },
          },
        },
      });
      expect(result.success).toBe(false);
    }

    const wrongSecret = {
      ...validRequest,
      actions: {
        getOrder: {
          ...validRequest.actions.getOrder,
          request: {
            ...validRequest.actions.getOrder.request,
            headers: { 'X-API-Key': '{{secrets.password}}' },
          },
        },
      },
    };
    expect(createConnectorTypeRequestSchema.safeParse(wrongSecret).success).toBe(false);
  });

  it('accepts a path with declared template fields', () => {
    const result = createConnectorTypeRequestSchema.safeParse({
      ...validRequest,
      actions: {
        getOrder: {
          ...validRequest.actions.getOrder,
          request: {
            ...validRequest.actions.getOrder.request,
            url: '{{config.baseUrl}}',
            path: '/orders/{{input.orderId}}',
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it.each([
    '/orders/{{input.missing}}',
    'orders',
    '//other.example/orders',
    '/orders?x=1',
    '/orders#x',
  ])('rejects an invalid path: %s', (path) => {
    const result = createConnectorTypeRequestSchema.safeParse({
      ...validRequest,
      actions: {
        getOrder: {
          ...validRequest.actions.getOrder,
          request: { ...validRequest.actions.getOrder.request, path },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate field names and unbounded request bodies', () => {
    const duplicateFields = {
      ...validRequest,
      config: [validRequest.config[0], { ...validRequest.config[0] }],
    };
    expect(createConnectorTypeRequestSchema.safeParse(duplicateFields).success).toBe(false);

    let deepValue: Record<string, unknown> = { tooDeep: true };
    for (let depth = 0; depth < 11; depth += 1) deepValue = { nested: deepValue };
    const oversizedBody = {
      ...validRequest,
      actions: {
        getOrder: {
          ...validRequest.actions.getOrder,
          request: { ...validRequest.actions.getOrder.request, body: deepValue },
        },
      },
    };
    expect(createConnectorTypeRequestSchema.safeParse(oversizedBody).success).toBe(false);
  });

  it('rejects reserved names, non-finite numbers, and request bodies with too many nodes', () => {
    const unsafeField = {
      ...validRequest,
      config: [{ name: 'constructor', type: 'string' as const }],
    };
    expect(createConnectorTypeRequestSchema.safeParse(unsafeField).success).toBe(false);

    const nonFiniteNumber = {
      ...validRequest,
      actions: {
        getOrder: {
          ...validRequest.actions.getOrder,
          request: {
            ...validRequest.actions.getOrder.request,
            body: { value: Number.POSITIVE_INFINITY },
          },
        },
      },
    };
    expect(createConnectorTypeRequestSchema.safeParse(nonFiniteNumber).success).toBe(false);

    const tooManyNodes = {
      ...validRequest,
      actions: {
        getOrder: {
          ...validRequest.actions.getOrder,
          request: {
            ...validRequest.actions.getOrder.request,
            body: { values: Array.from({ length: 500 }, () => null) },
          },
        },
      },
    };
    expect(createConnectorTypeRequestSchema.safeParse(tooManyNodes).success).toBe(false);
  });

  it('rejects unknown top-level fields', () => {
    expect(
      createConnectorTypeRequestSchema.safeParse({ ...validRequest, unexpected: true }).success
    ).toBe(false);
  });
});
