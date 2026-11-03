/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { generateOpenApiDocument } from '@kbn/router-to-openapispec';
import type { OpenAPIV3 } from 'openapi-types';
import { bulkDeleteParamsSchema, bulkDeleteStatusParamsSchema } from './bulk_delete';
import { bulkPurgeRollupSchema } from './bulk_purge_rollup';
import { createSLOParamsSchema } from './create';
import { deleteSLOInstancesParamsSchema } from './delete_instance';
import { findSLOParamsSchema } from './find';
import { findSloDefinitionsParamsSchema } from './find_definition';
import { getSLOParamsSchema } from './get';
import { bulkSnapshotParamsSchema, getSnapshotParamsSchema } from './snapshot';
import { updateSLOParamsSchema } from './update';

interface RequestSchemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

const ROUTE_METHOD = 'post';

const generate = (request: RequestSchemas, path: string) =>
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
              validationSchemas: { request },
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
