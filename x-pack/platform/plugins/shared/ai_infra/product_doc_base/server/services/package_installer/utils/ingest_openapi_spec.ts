/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

interface Document {
  path: string;
  method: string;
  description: string | undefined;
  summary: string | undefined;
  parameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[] | undefined;
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject;
  example: unknown;
  tags?: string[];
  externalDocs?: OpenAPIV3.ExternalDocumentationObject;
  operationId?: string;
  requestBody?: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject;
  responses?: OpenAPIV3.ResponsesObject;
  callbacks?: { [callback: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.CallbackObject };
  deprecated?: boolean;
  security?: OpenAPIV3.SecurityRequirementObject[];
  servers?: OpenAPIV3.ServerObject[];
}

function generateDocuments(openApiSpec: OpenAPIV3.Document): Document[] {
  const documents = Object.entries(openApiSpec.paths)
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
            const resolvedParam = openApiSpec.components?.parameters?.[refName];
            return resolvedParam || param;
          }
          if ('$ref' in param && (!('schema' in param) || !param.schema)) {
            return param;
          }

          const { schema } = param as { schema: OpenAPIV3.SchemaObject };

          if (schema && '$ref' in schema) {
            const ref = schema.$ref as string;
            const refName = ref.replace('#/components/schemas/', '');
            const resolvedSchema = openApiSpec.components?.schemas?.[refName];
            return { ...param, schema: resolvedSchema || schema };
          }

          return param;
        });

        let response = operation.responses?.['200'];

        if ('$ref' in response) {
          const ref = response.$ref as string;
          const refName = ref.replace('#/components/responses/', '');
          const resolvedResponse = openApiSpec.components?.responses?.[refName];
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
            const resolvedSchema = openApiSpec.components?.schemas?.[refName];
            response.content['application/json'].schema = resolvedSchema || schema;
          }
        }

        return {
          ...operation,
          path,
          method,
          description: operation.description,
          summary: operation.summary,
          parameters,
          response,
          example: (operation as Record<string, unknown>)['x-codeSamples'],
        };
      });
    })
    .flat();
  return documents;
}

async function ingestDoc(
  indexName: string,
  documents: Document[],
  esClient: ElasticsearchClient,
  logger: Logger
) {
  logger.info(`Total documents in file: ${documents.length}`);

  const exists = await esClient.indices.exists({ index: indexName });
  if (exists) {
    logger.info(`Index ${indexName} already exists. Deleting...`);
    await esClient.indices.delete({ index: indexName });
    logger.info(`Index ${indexName} deleted.`);
  }

  logger.info(`Creating index ${indexName}...`);
  await esClient.indices.create({
    index: indexName,
    settings: {
      'index.mapping.total_fields.limit': 2000,
    },
    mappings: {
      properties: {
        // Semantic text fields for semantic search
        description: {
          type: 'semantic_text',
          inference_id: '.multilingual-e5-small-elasticsearch',
        },
        endpoint: {
          type: 'semantic_text',
          inference_id: '.multilingual-e5-small-elasticsearch',
        },
        summary: {
          type: 'semantic_text',
          inference_id: '.multilingual-e5-small-elasticsearch',
        },
        // Text fields for lexical search
        description_text: { type: 'text' },
        summary_text: { type: 'text' },
        operationId: { type: 'text' },
        // Keyword fields for exact and prefix matching
        method: { type: 'keyword' },
        path: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        tags: { type: 'keyword' },
        // Nested and other fields
        parameters: {
          type: 'object',
          enabled: false,
        },
        responses: {
          type: 'object',
          enabled: false,
        },
        example: {
          type: 'object',
          enabled: false,
        },
      },
    },
  });
  logger.info(`Index ${indexName} created successfully.`);

  // Prepare bulk operations only with the needed fields
  logger.info('Preparing bulk operations...');
  const operations = documents.flatMap((doc) => {
    const payload: Record<string, any> = {
      // Search fields
      description: doc.description ?? '',
      summary: doc.summary ?? '',
      operationId: doc.operationId ?? '',
      method: doc.method ?? '',
      path: doc.path ?? '',
      tags: doc.tags ?? [],
      // Text versions for lexical search
      description_text: doc.description ?? '',
      summary_text: doc.summary ?? '',
      // Store complete data for tool generation (but don't index deeply)
      parameters: doc.parameters ?? [],
      responses: doc.responses ?? {},
      example: doc.example ?? [],
    };
    if (doc.method && doc.path) {
      payload.endpoint = `${doc.method.toUpperCase()} ${doc.path}`;
    }

    return [{ index: { _index: indexName } }, payload];
  });

  logger.info(`Bulk operations prepared: ${operations.length / 2} documents`);
  logger.info('Starting bulk indexing...');

  const response = await esClient.bulk({
    refresh: true,
    operations: operations as any,
  });

  if (response.errors) {
    const errorItems = response.items.filter((item) => item.index?.error);
    logger.error(`Bulk indexing had ${errorItems.length} errors:`);
    errorItems.slice(0, 5).forEach((item) => {
      logger.error(JSON.stringify(item.index?.error, null, 2));
    });
    throw new Error(
      `Error indexing documents: ${errorItems.length} failed out of ${response.items.length}`
    );
  }

  logger.info(`Successfully indexed ${response.items.length} documents!`);
  logger.info(`Took: ${response.took}ms`);
}

export async function ingestOpenApiSpec({
  indexName,
  esClient,
  openApiSpec,
  logger,
}: {
  indexName: string;
  openApiSpec: OpenAPIV3.Document;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  const documents = generateDocuments(openApiSpec);
  await ingestDoc(indexName, documents, esClient, logger);
}
