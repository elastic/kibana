/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { generateOpenApiDocument } from '@kbn/router-to-openapispec';
import type { OpenAPIV3 } from 'openapi-types';
import {
  bulkDeleteParamsSchema,
  bulkDeleteResponseSchema,
  bulkDeleteStatusParamsSchema,
  bulkDeleteStatusResponseSchema,
} from './bulk_delete';
import { bulkPurgeRollupResponseSchema, bulkPurgeRollupSchema } from './bulk_purge_rollup';
import { createSLOParamsSchema, createSLOResponseSchema } from './create';
import { deleteSLOInstancesParamsSchema } from './delete_instance';
import { findSLOParamsSchema, findSLOResponseSchema } from './find';
import {
  findSloDefinitionsParamsSchema,
  findSloDefinitionsResponseSchema,
} from './find_definition';
import { getSLOParamsSchema, getSLOResponseSchema } from './get';
import { resetSLOResponseSchema } from './reset';
import {
  bulkSnapshotParamsSchema,
  getSnapshotParamsSchema,
  snapshotResponseSchema,
} from './snapshot';
import { updateSLOParamsSchema, updateSLOResponseSchema } from './update';

interface RequestSchemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

const ROUTE_METHOD = 'post';

const generate = (request: RequestSchemas, path: string, response?: z.ZodType) =>
  generateOpenApiDocument(
    {
      routers: [
        {
          getRoutes: () => [
            {
              path,
              method: ROUTE_METHOD,
              isVersioned: false,
              handler: jest.fn(),
              options: { access: 'public' },
              validationSchemas: {
                request,
                ...(response && { response: { 200: { body: () => response } } }),
              },
            },
          ],
        },
      ] as unknown as Parameters<typeof generateOpenApiDocument>[0]['routers'],
      versionedRouters: [],
    },
    { title: 'SLO', version: '1.0.0', baseUrl: 'https://localhost/' }
  );

const getDocumentedParameters = async (
  request: RequestSchemas,
  path = '/api/route'
): Promise<OpenAPIV3.ParameterObject[]> => {
  const doc = await generate(request, path);
  return (doc.paths[path]?.[ROUTE_METHOD]?.parameters ?? []) as OpenAPIV3.ParameterObject[];
};

const getBodyPropertyDescriptions = async (
  body: z.ZodType,
  propertyPaths: string[]
): Promise<Record<string, string | undefined>> => {
  const doc = await generate({ body }, '/api/route');
  const components = (doc.components?.schemas ?? {}) as Record<string, Schema>;
  const resolve = (schema: Schema | undefined): OpenAPIV3.SchemaObject | undefined =>
    schema && '$ref' in schema ? resolve(components[schema.$ref.split('/').pop() ?? '']) : schema;
  const findProperty = (schema: Schema | undefined, key: string): Schema | undefined => {
    const resolved = resolve(schema);
    if (!resolved) return undefined;
    if (key.endsWith('[]')) {
      const property = findProperty(resolved, key.slice(0, -2));
      const array = resolve(property);
      return array && 'items' in array ? array.items : undefined;
    }
    if (resolved.properties?.[key]) return resolved.properties[key];
    return [...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])]
      .map((variant) => findProperty(variant, key))
      .find(Boolean);
  };
  const requestBody = doc.paths['/api/route']?.[ROUTE_METHOD]?.requestBody as
    | OpenAPIV3.RequestBodyObject
    | undefined;
  const bodySchema = requestBody && Object.values(requestBody.content)[0].schema;

  return Object.fromEntries(
    propertyPaths.map((propertyPath) => {
      const keys = propertyPath.split('.');
      const property = keys.reduce<Schema | undefined>(findProperty, bodySchema);
      const description =
        (property && 'description' in property ? property.description : undefined) ??
        resolve(property)?.description;
      return [propertyPath, description];
    })
  );
};

const expectEveryParameterDescribed = (parameters: OpenAPIV3.ParameterObject[]) => {
  expect(parameters.length).toBeGreaterThan(0);
  for (const { name, description } of parameters) {
    expect({ name, description }).toEqual({ name, description: expect.stringMatching(/\S/) });
  }
};

const expectEveryPropertyDescribed = (descriptions: Record<string, string | undefined>) => {
  for (const [propertyPath, description] of Object.entries(descriptions)) {
    expect({ propertyPath, description }).toEqual({
      propertyPath,
      description: expect.stringMatching(/\S/),
    });
  }
};

describe('SLO public route parameters are documented', () => {
  it('find SLOs', async () => {
    expectEveryParameterDescribed(
      await getDocumentedParameters({ query: findSLOParamsSchema.shape.query.unwrap() })
    );
  });

  it('find SLO definitions', async () => {
    expectEveryParameterDescribed(
      await getDocumentedParameters({ query: findSloDefinitionsParamsSchema.shape.query.unwrap() })
    );
  });

  it('get SLO', async () => {
    expectEveryParameterDescribed(
      await getDocumentedParameters(
        {
          params: getSLOParamsSchema.shape.path,
          query: getSLOParamsSchema.shape.query.unwrap(),
        },
        '/api/route/{id}'
      )
    );
  });

  it('get SLO snapshot', async () => {
    expectEveryParameterDescribed(
      await getDocumentedParameters(
        {
          params: getSnapshotParamsSchema.shape.path,
          query: getSnapshotParamsSchema.shape.query,
        },
        '/api/route/{id}'
      )
    );
  });

  it('get bulk delete status', async () => {
    expectEveryParameterDescribed(
      await getDocumentedParameters(
        { params: bulkDeleteStatusParamsSchema.shape.path },
        '/api/route/{taskId}'
      )
    );
  });
});

describe('SLO public route request bodies are documented', () => {
  const SLO_DEFINITION_PROPERTIES = ['name', 'description', 'settings', 'groupBy', 'artifacts'];

  it('create SLO', async () => {
    expectEveryPropertyDescribed(
      await getBodyPropertyDescriptions(createSLOParamsSchema.shape.body, SLO_DEFINITION_PROPERTIES)
    );
  });

  it('update SLO', async () => {
    expectEveryPropertyDescribed(
      await getBodyPropertyDescriptions(updateSLOParamsSchema.shape.body, SLO_DEFINITION_PROPERTIES)
    );
  });

  it('bulk delete SLOs', async () => {
    expectEveryPropertyDescribed(
      await getBodyPropertyDescriptions(bulkDeleteParamsSchema.shape.body, ['list'])
    );
  });

  it('bulk purge rollup data', async () => {
    expectEveryPropertyDescribed(
      await getBodyPropertyDescriptions(bulkPurgeRollupSchema.shape.body, [
        'list',
        'purgePolicy',
        'purgePolicy.purgeType',
      ])
    );
  });

  it('describes the route-specific meaning of shared date and duration fields', async () => {
    expect(
      await getBodyPropertyDescriptions(bulkPurgeRollupSchema.shape.body, [
        'purgePolicy.age',
        'purgePolicy.timestamp',
      ])
    ).toEqual({
      'purgePolicy.age': expect.stringContaining('which documents to purge'),
      'purgePolicy.timestamp': expect.stringContaining('which documents to purge'),
    });
    expect(await getBodyPropertyDescriptions(bulkSnapshotParamsSchema.shape.body, ['at'])).toEqual({
      at: expect.stringContaining('SLO instance summaries'),
    });
  });

  it('delete SLO instances', async () => {
    expectEveryPropertyDescribed(
      await getBodyPropertyDescriptions(deleteSLOInstancesParamsSchema.shape.body, [
        'list',
        'list[].instanceId',
      ])
    );
  });

  it('bulk snapshot', async () => {
    expectEveryPropertyDescribed(
      await getBodyPropertyDescriptions(bulkSnapshotParamsSchema.shape.body, [
        'requests',
        'requests[].instanceId',
      ])
    );
  });
});

describe('SLO public route responses are documented', () => {
  const generateResponse = async (response: z.ZodType) => {
    const doc = await generate({}, '/api/route', response);
    const responseObject = doc.paths['/api/route']?.[ROUTE_METHOD]?.responses[200] as
      | OpenAPIV3.ResponseObject
      | undefined;
    const schema = responseObject?.content && Object.values(responseObject.content)[0].schema;
    const components = (doc.components?.schemas ?? {}) as Record<string, OpenAPIV3.SchemaObject>;
    return { schema, components };
  };

  it.each([
    ['create SLO', 'SLOCreateResponse', createSLOResponseSchema],
    ['find SLOs', 'SLOFindResponse', findSLOResponseSchema],
    ['get SLO', 'SLOWithSummaryResponse', getSLOResponseSchema],
    ['update SLO', 'SLODefinition', updateSLOResponseSchema],
    ['reset SLO', 'SLODefinition', resetSLOResponseSchema],
    ['find SLO definitions', 'SLOFindDefinitionsResponse', findSloDefinitionsResponseSchema],
    ['bulk delete SLOs', 'SLOBulkDeleteResponse', bulkDeleteResponseSchema],
    ['bulk delete status', 'SLOBulkDeleteStatusResponse', bulkDeleteStatusResponseSchema],
    ['bulk purge rollup data', 'SLOBulkPurgeRollupResponse', bulkPurgeRollupResponseSchema],
    ['snapshot', 'SLOSnapshotResponse', snapshotResponseSchema],
  ])('%s references the open %s component', async (_, id, response) => {
    const { schema, components } = await generateResponse(response);
    expect(schema).toEqual({ $ref: `#/components/schemas/${id}` });
    expect(components[id]).toHaveProperty('additionalProperties', true);
  });

  it.each([
    'SLOWithSummaryResponse',
    'SLOSummary',
    'SLOErrorBudget',
    'SLODefinitionResponse',
    'SLOBulkDeleteResult',
  ])('documents the nested %s component as open', async (id) => {
    const { components } = await generateResponse(
      z.object({
        find: findSLOResponseSchema,
        definitions: findSloDefinitionsResponseSchema,
        snapshot: snapshotResponseSchema,
        bulkDeleteStatus: bulkDeleteStatusResponseSchema,
      })
    );
    expect(components[id]).toHaveProperty('additionalProperties', true);
  });

  it('documents every snapshot result variant as open', async () => {
    const { components } = await generateResponse(snapshotResponseSchema);
    const { anyOf = [] } = components.SLOSnapshotResult;
    expect(anyOf).toHaveLength(2);
    for (const variant of anyOf) {
      expect(variant).toHaveProperty('additionalProperties', true);
    }
  });

  it('documents the meta and remote objects of an SLO as open', async () => {
    const { components } = await generateResponse(getSLOResponseSchema);
    const { meta, remote } = components.SLOWithSummaryResponse.properties ?? {};
    expect(meta).toHaveProperty('additionalProperties', true);
    expect(meta).toHaveProperty('properties.synthetics.additionalProperties', true);
    expect(remote).toHaveProperty('additionalProperties', true);
  });

  it('keeps components shared with request bodies closed', async () => {
    const { components } = await generateResponse(getSLOResponseSchema);
    expect(components.SLOObjective).toHaveProperty('additionalProperties', false);
    expect(components.SLOSettings).toHaveProperty('additionalProperties', false);
  });

  it('documents response dates as date-time', async () => {
    const { components } = await generateResponse(
      z.object({
        definition: updateSLOResponseSchema,
        slo: getSLOResponseSchema,
        snapshot: snapshotResponseSchema,
      })
    );
    for (const id of ['SLODefinition', 'SLOWithSummaryResponse']) {
      expect(components[id].properties).toEqual(
        expect.objectContaining({
          createdAt: expect.objectContaining({ format: 'date-time' }),
          updatedAt: expect.objectContaining({ format: 'date-time' }),
        })
      );
    }
    expect(components.SLOSummary.properties?.summaryUpdatedAt).toEqual(
      expect.objectContaining({ format: 'date-time' })
    );
    expect(components.SLOSnapshotResponse.properties?.at).toEqual(
      expect.objectContaining({ format: 'date-time' })
    );
  });
});
