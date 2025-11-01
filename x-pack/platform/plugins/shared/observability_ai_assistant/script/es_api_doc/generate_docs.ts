/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OpenAPIV3 } from 'openapi-types';

const inputPath = resolve(__dirname, 'elasticsearch_openapi_source.json');
const outputPath = resolve(__dirname, 'documents.json');

const raw = readFileSync(inputPath, 'utf-8');
const openApiDocument: OpenAPIV3.Document = JSON.parse(raw);

const documents = Object.entries(openApiDocument.paths)
  .map(([path, methods]) => {
    if (!methods) {
      return [];
    }

    // ignore paths that contant _cat -> https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cat
    if (path.includes('/_cat/')) {
      return [];
    }

    return Object.entries(methods).map(([method, operation]) => {
      if (!operation || typeof operation === 'string' || !('operationId' in operation)) {
        throw new Error(`Invalid operation for path ${path} and method ${method}`);
      }
      const parameters = operation.parameters?.map((param) => {
        if ('$ref' in param) {
          const ref = param.$ref as string;
          const refName = ref.replace('#/components/parameters/', '');
          const resolvedParam = openApiDocument.components?.parameters?.[refName];
          return resolvedParam || param;
        }
        if ('$ref' in param && (!('schema' in param) || !param.schema)) {
          return param;
        }

        const { schema } = param as { schema: OpenAPIV3.SchemaObject };

        if (schema && '$ref' in schema) {
          const ref = schema.$ref as string;
          const refName = ref.replace('#/components/schemas/', '');
          const resolvedSchema = openApiDocument.components?.schemas?.[refName];
          return { ...param, schema: resolvedSchema || schema };
        }

        return param;
      });

      let response = operation.responses?.['200'];

      if ('$ref' in response) {
        const ref = response.$ref as string;
        const refName = ref.replace('#/components/responses/', '');
        const resolvedResponse = openApiDocument.components?.responses?.[refName];
        response = resolvedResponse || response;
      }
      if (
        response &&
        typeof response === 'object' &&
        'content' in response &&
        response.content &&
        response.content['application/json']
      ) {
        const { schema } = response.content['application/json'] as {
          schema: OpenAPIV3.SchemaObject;
        };
        if (schema && '$ref' in schema) {
          const ref = schema.$ref as string;
          const refName = ref.replace('#/components/schemas/', '');
          const resolvedSchema = openApiDocument.components?.schemas?.[refName];
          response.content['application/json'].schema = resolvedSchema || schema;
        }
      }

      return {
        title: `${method?.toUpperCase()} ${path}`,
        description: operation.description,
        summary: operation.summary,
        parameters,
        response,
        example: (operation as Record<string, unknown>)['x-codeSamples'],
      };
    });
  })
  .flat();

writeFileSync(outputPath, JSON.stringify(documents), 'utf-8');
