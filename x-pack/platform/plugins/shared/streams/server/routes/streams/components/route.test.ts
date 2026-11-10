/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsComponentValidationRequestSchema } from '@kbn/streams-schema';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import { kibanaResponseFactory } from '@kbn/core/server';
import { getComponentCatalogueRoute, validateComponentRoute } from './route';

const getRoute = getComponentCatalogueRoute['GET /internal/streams/components'];
const validateRoute = validateComponentRoute['POST /internal/streams/components/_validate'];

type GetHandlerParams = Parameters<typeof getRoute.handler>[0];
type ValidateHandlerParams = Parameters<typeof validateRoute.handler>[0];

const catalogue: ComponentCatalogue = {
  schema_version: 'v1',
  component_revision: 'sha256:revision',
  components: [],
  metadata: { schema_version: 'v1', enum_sets: {}, path_sets: {} },
  definitions: [],
};

const processor = {
  id: 'tag',
  type: 'add_fields',
  supported_telemetry: ['logs' as const],
  config: [{ name: 'fields', value: [{ location: 'record', path: 'tier', action: 'upsert' }] }],
};

const scopedClients = (canvasEnabled: boolean) =>
  jest.fn().mockResolvedValue({
    uiSettingsClient: { get: jest.fn().mockResolvedValue(canvasEnabled) },
  });

const request = { events: { aborted$: { subscribe: jest.fn() } } };

const routeResources = {
  request,
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  telemetry: {
    startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
    reportStreamsStateError: jest.fn(),
  },
};

describe('GET /internal/streams/components', () => {
  it('returns the catalogue with the distributor ETag, reusable by the browser for a minute', async () => {
    const get = jest.fn().mockResolvedValue({ catalogue, etag: '"sha256:body"', stale: false });

    const response = await getRoute.handler({
      ...routeResources,
      response: kibanaResponseFactory,
      getScopedClients: scopedClients(true),
      componentCatalogue: { get, validate: jest.fn() },
    } as unknown as GetHandlerParams);

    expect(response.status).toBe(200);
    expect(response.payload).toBe(catalogue);
    // Hapi quotes the tag itself, so the route passes it bare.
    expect(response.options.headers).toEqual({
      etag: 'sha256:body',
      'cache-control': 'private, max-age=60, stale-while-revalidate=86400',
    });
  });

  it('marks a catalogue served while the distributor is unreachable, and does not let the browser keep it', async () => {
    const get = jest.fn().mockResolvedValue({ catalogue, etag: '"sha256:body"', stale: true });

    const response = await getRoute.handler({
      ...routeResources,
      response: kibanaResponseFactory,
      getScopedClients: scopedClients(true),
      componentCatalogue: { get, validate: jest.fn() },
    } as unknown as GetHandlerParams);

    expect(response.status).toBe(200);
    // No ETag: a 304 on it after recovery would leave the stale marker in the browser's copy.
    expect(response.options.headers).toEqual({
      'cache-control': 'private, no-cache',
      'x-streams-catalogue-stale': 'true',
    });
  });

  it('answers 404 without fetching when the canvas is disabled', async () => {
    const get = jest.fn();

    await expect(
      getRoute.handler({
        ...routeResources,
        response: kibanaResponseFactory,
        getScopedClients: scopedClients(false),
        componentCatalogue: { get, validate: jest.fn() },
      } as unknown as GetHandlerParams)
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
    expect(get).not.toHaveBeenCalled();
  });
});

describe('POST /internal/streams/components/_validate', () => {
  it('returns the distributor verdict for one component', async () => {
    const result = {
      valid: false,
      diagnostics: [{ severity: 'error', code: 'E028_INVALID_CONFIG_TYPE', message: 'bad action' }],
    };
    const validate = jest.fn().mockResolvedValue(result);

    await expect(
      validateRoute.handler({
        params: { body: { kind: 'processor', component: processor } },
        ...routeResources,
        getScopedClients: scopedClients(true),
        componentCatalogue: { get: jest.fn(), validate },
      } as unknown as ValidateHandlerParams)
    ).resolves.toEqual(result);
    expect(validate).toHaveBeenCalledWith({
      kind: 'processor',
      component: processor,
      signal: expect.any(AbortSignal),
    });
  });

  it('answers 404 without validating when the canvas is disabled', async () => {
    const validate = jest.fn();

    await expect(
      validateRoute.handler({
        params: { body: { kind: 'processor', component: processor } },
        ...routeResources,
        getScopedClients: scopedClients(false),
        componentCatalogue: { get: jest.fn(), validate },
      } as unknown as ValidateHandlerParams)
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
    expect(validate).not.toHaveBeenCalled();
  });

  it('accepts one component of a known kind and bounds its fields', () => {
    expect(
      streamsComponentValidationRequestSchema.safeParse({ kind: 'processor', component: processor })
        .success
    ).toBe(true);
    expect(
      streamsComponentValidationRequestSchema.safeParse({ kind: 'pipeline', component: processor })
        .success
    ).toBe(false);
    expect(
      streamsComponentValidationRequestSchema.safeParse({
        kind: 'processor',
        component: { ...processor, id: 'Not An Id' },
      }).success
    ).toBe(false);
    expect(
      streamsComponentValidationRequestSchema.safeParse({
        kind: 'processor',
        component: {
          ...processor,
          config: Array.from({ length: 501 }, (_, index) => ({ name: `f${index}`, value: 1 })),
        },
      }).success
    ).toBe(false);
  });
});
