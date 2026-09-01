/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Spike tests gating the io-ts → zod migration: they prove the platform tooling
 * that every zod route schema flows through handles `z.codec()`-based schemas
 * (Duration/Date rich types) correctly.
 *
 * 1. `DeepStrict` from @kbn/zod-helpers — what `makeZodValidationObject` wraps
 *    every route params/query/body schema in at registration time.
 * 2. The `z.safeEncode`-based `is` guard — the semantic twin of io-ts `.is()`.
 * 3. The OAS generation pipeline of @kbn/router-to-openapispec — what
 *    `server.oas.enabled: true` runs against registered zod routes.
 */

import { z } from '@kbn/zod';
import { DeepStrict, expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import { generateOpenApiDocument } from '@kbn/router-to-openapispec';
import type { OpenAPIV3 } from 'openapi-types';
import { Duration, DurationUnit } from '../../models/duration';
import { buildDomainSLO, buildWireSLO } from '../../test_helpers/fixtures';
import { dateType } from './common';
import { durationType } from './duration';
import { is } from './guards';
import { indicatorSchema, indicatorTypesArraySchema } from './indicators';
import { objectiveSchema, optionalSettingsSchema, sloDefinitionSchema, sloIdSchema } from './slo';
import { timeWindowSchema } from './time_window';

describe('DeepStrict × z.codec', () => {
  // Exactly what makeZodValidationObject does with a route `body` schema.
  const strictBody = DeepStrict(sloDefinitionSchema);

  it('parses valid input containing codec fields', () => {
    expectParseSuccess(strictBody.safeParse(buildWireSLO()));
  });

  it('does not false-positive on Duration/Date instances in the parsed output', () => {
    // DeepStrict diffs the flattened keys of the raw input against the parsed
    // output; Duration/Date class instances in the output must be treated as
    // leaves, exactly like their wire-form string counterparts in the input.
    const result = strictBody.safeParse({
      ...buildWireSLO(),
      artifacts: { dashboards: [{ id: 'dashboard-id' }] },
    });
    expectParseSuccess(result);
    expect(result.data.timeWindow.duration).toBeInstanceOf(Duration);
    expect(result.data.settings.syncDelay).toBeInstanceOf(Duration);
    expect(result.data.createdAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown top-level key', () => {
    const result = strictBody.safeParse({ ...buildWireSLO(), unknownKey: 'value' });
    expectParseError(result);
    expect(result.error.issues[0].code).toBe('unrecognized_keys');
    expect(JSON.stringify(result.error.issues[0])).toContain('unknownKey');
  });

  it('rejects an unknown nested key next to a codec field', () => {
    const wireSLO = buildWireSLO();
    const result = strictBody.safeParse({
      ...wireSLO,
      timeWindow: { ...wireSLO.timeWindow, extra: true },
    });
    expectParseError(result);
    expect(result.error.issues[0].code).toBe('unrecognized_keys');
    expect(JSON.stringify(result.error.issues[0])).toContain('timeWindow.extra');
  });

  it('preserves schema-level errors for invalid codec input', () => {
    const result = strictBody.safeParse({
      ...buildWireSLO(),
      timeWindow: { duration: '0d', type: 'rolling' },
    });
    expectParseError(result);
    expect(JSON.stringify(result.error.issues)).toContain('duration');
  });
});

describe('z.safeEncode-based is() guard × z.codec', () => {
  it('accepts the decoded form (Duration/Date instances)', () => {
    expect(is(durationType, new Duration(30, DurationUnit.Day))).toBe(true);
    expect(is(dateType, new Date('2024-01-01T00:00:00.000Z'))).toBe(true);
    expect(is(sloDefinitionSchema, buildDomainSLO())).toBe(true);
  });

  it('rejects the wire form (strings), mirroring io-ts .is()', () => {
    expect(is(durationType, '30d')).toBe(false);
    expect(is(dateType, '2024-01-01T00:00:00.000Z')).toBe(false);
    expect(is(sloDefinitionSchema, buildWireSLO())).toBe(false);
  });

  it('narrows the type to the decoded side', () => {
    const value: unknown = new Duration(30, DurationUnit.Day);
    if (is(durationType, value)) {
      expect(value.asMinutes()).toBe(30 * 24 * 60);
    } else {
      throw new Error('expected the guard to pass');
    }
  });
});

describe('OAS conversion × z.codec', () => {
  const createBodySchema = z.object({
    name: z.string().max(1024).describe('The name of the SLO.'),
    description: z.string().max(4096).describe('The description of the SLO.'),
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    objective: objectiveSchema,
    id: sloIdSchema.optional(),
    settings: optionalSettingsSchema.optional(),
  });

  const buildRouters = (routes: Array<Record<string, unknown>>) => {
    const withDefaults = routes.map((route) => ({
      isVersioned: false,
      handler: jest.fn(),
      ...route,
    }));
    return [{ getRoutes: () => withDefaults }] as unknown as Parameters<
      typeof generateOpenApiDocument
    >[0]['routers'];
  };

  const generate = (routes: Array<Record<string, unknown>>) =>
    generateOpenApiDocument(
      { routers: buildRouters(routes), versionedRouters: [] },
      { title: 'SLO zod spike', version: '1.0.0', baseUrl: 'https://localhost/' }
    );

  it('converts a codec-bearing body schema to a sane JSON schema', async () => {
    const doc = await generate([
      {
        path: '/api/observability/slos',
        method: 'post',
        options: { access: 'public', summary: 'Create an SLO' },
        validationSchemas: { request: { body: createBodySchema } },
      },
    ]);

    const operation = doc.paths['/api/observability/slos']?.post;
    expect(operation).toBeDefined();
    const requestBody = operation?.requestBody as OpenAPIV3.RequestBodyObject;
    const bodySchema = Object.values(requestBody.content)[0].schema as OpenAPIV3.SchemaObject;

    expect(bodySchema.type).toBe('object');
    expect(bodySchema.required).toEqual(
      expect.arrayContaining(['name', 'description', 'indicator', 'timeWindow', 'objective'])
    );

    // .meta({ id }) schemas become named components referenced from the body.
    expect(bodySchema.properties?.timeWindow).toEqual({
      $ref: '#/components/schemas/SLOTimeWindow',
    });
    expect(bodySchema.properties?.indicator).toEqual(
      expect.objectContaining({ $ref: '#/components/schemas/SLOIndicator' })
    );

    const components = doc.components?.schemas as Record<string, OpenAPIV3.SchemaObject>;
    expect(Object.keys(components)).toEqual(
      expect.arrayContaining([
        'SLOTimeWindow',
        'SLOIndicator',
        'SLOObjective',
        'SLOIndicatorPropertiesCustomKql',
        'SLOIndicatorPropertiesApmLatency',
      ])
    );

    // The `openapi.discriminator` meta extension is carried onto the component.
    expect(components.SLOIndicator.discriminator).toEqual({
      propertyName: 'type',
      mapping: expect.objectContaining({
        'sli.kql.custom': '#/components/schemas/SLOIndicatorPropertiesCustomKql',
      }),
    });

    // The duration codec is documented from its INPUT side: a bounded string,
    // not an unrepresentable Duration class.
    const timeWindowComponent = components.SLOTimeWindow;
    const rollingVariant = (timeWindowComponent.oneOf ??
      timeWindowComponent.anyOf) as OpenAPIV3.SchemaObject[];
    expect(rollingVariant).toBeDefined();
    const duration = rollingVariant[0].properties?.duration as OpenAPIV3.SchemaObject;
    expect(duration.type).toBe('string');
    expect(duration.maxLength).toBe(16);
    expect(duration.description).toContain('duration');

    // The objective component documents its optional duration codec field the same way.
    const timesliceWindow = components.SLOObjective.properties
      ?.timesliceWindow as OpenAPIV3.SchemaObject;
    expect(timesliceWindow.type).toBe('string');
    expect(timesliceWindow.maxLength).toBe(16);

    // No Duration/Date class internals leak into the document.
    const raw = JSON.stringify(doc);
    expect(raw).not.toContain('instanceof');
    expect(raw).not.toContain('"unit"');
  });

  it('converts a codec-bearing query schema when the codec output is string-like', async () => {
    const doc = await generate([
      {
        path: '/api/observability/slos',
        method: 'get',
        options: { access: 'public', summary: 'Find SLOs' },
        validationSchemas: {
          request: { query: z.object({ indicatorTypes: indicatorTypesArraySchema.optional() }) },
        },
      },
    ]);

    const operation = doc.paths['/api/observability/slos']?.get;
    expect(operation).toBeDefined();
    const parameters = operation?.parameters as OpenAPIV3.ParameterObject[];
    const indicatorTypes = parameters.find((param) => param.name === 'indicatorTypes');
    expect(indicatorTypes).toBeDefined();
    expect(indicatorTypes?.required).toBe(false);
    // KNOWN PLATFORM GAP (mis-documentation, no crash): the query converter
    // unwraps a z.codec to its OUTPUT side, so the CSV codec is documented as
    // an array instead of the comma-separated string actually sent on the
    // wire. The upstream fix (plan decision #9) is to document pipes/codecs
    // from their input side; this assertion pins today's behavior and will
    // fail loudly once the platform is fixed.
    expect((indicatorTypes?.schema as OpenAPIV3.SchemaObject).type).toBe('array');
  });

  it('KNOWN PLATFORM GAP: rejects query params whose codec output is a class instance', async () => {
    // `dateType` (and `durationType`) have a `z.instanceof(...)` output side.
    // The query/path parameter converter unwraps the codec to that output side
    // and throws because it is neither string-like nor coercible, so any route
    // with a date/duration codec in `query`/`path` (e.g. the snapshot route's
    // `at: dateType`) would break /api/oas generation. Requires the upstream
    // kbn-router-to-openapispec fix agreed in plan decision #9. This test pins
    // the failure as evidence and will fail loudly once the platform is fixed.
    await expect(
      generate([
        {
          path: '/api/observability/slos/{id}/_snapshot',
          method: 'get',
          options: { access: 'public', summary: 'Get SLO snapshot' },
          validationSchemas: { request: { query: z.object({ at: dateType.optional() }) } },
        },
      ])
    ).rejects.toThrow(
      'Input parser key: "at" must be ZodString, ZodNumber, ZodBoolean, ZodBigInt or ZodDate'
    );
  });
});
