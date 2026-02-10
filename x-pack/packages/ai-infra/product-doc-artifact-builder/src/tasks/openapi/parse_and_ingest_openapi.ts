/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Path from 'path';
import type { OpenAPIV3 } from 'openapi-types';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { deleteIndex } from '../delete_index';
import { indexDocuments } from '../index_documents';
import { DEFAULT_ELSER, getSemanticTextMapping } from '../create_index';

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

      // ignore paths that contain _cat -> https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cat
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

        if (response && '$ref' in response) {
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

async function createOpenAPIIndex({
  indexName,
  client,
  logger,
  inferenceId,
}: {
  indexName: string;
  client: Client;
  logger: ToolingLog;
  inferenceId?: string;
}) {
  const semanticTextMapping = getSemanticTextMapping(inferenceId);
  logger.info(`Creating index ${indexName}...`);
  await client.indices.create({
    index: indexName,
    settings: {
      'index.mapping.total_fields.limit': 2000,
    },
    mappings: {
      properties: {
        // Semantic text fields for semantic search
        description: semanticTextMapping,
        endpoint: semanticTextMapping,
        summary: semanticTextMapping,
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
}

function removeEmptyTextFields(document: Record<string, any>): Record<string, any> {
  const cleanedDoc = { ...document };

  // List of text fields that should be removed if empty
  const textFields = [
    'description',
    'summary',
    'endpoint',
    'description_text',
    'summary_text',
    'operationId',
  ];

  for (const field of textFields) {
    if (cleanedDoc[field] === '' || cleanedDoc[field] === null || cleanedDoc[field] === undefined) {
      delete cleanedDoc[field];
    }
  }

  return cleanedDoc;
}

function transformDocumentsToIndexFormat(documents: Document[]): Array<Record<string, any>> {
  return documents.map((doc) => {
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
    return removeEmptyTextFields(payload);
  });
}

export async function ingestOpenApiSpec({
  indexName,
  esClient,
  openApiSpec,
  logger,
  inferenceId = DEFAULT_ELSER,
}: {
  indexName: string;
  openApiSpec: OpenAPIV3.Document;
  esClient: Client;
  logger: ToolingLog;
  inferenceId?: string;
}) {
  const documents = generateDocuments(openApiSpec);

  // Save documents to temporary directory
  const tmpDir = Path.join(__dirname, '__tmp__');
  await Fs.mkdir(tmpDir, { recursive: true });

  const fileName = `${indexName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  const filePath = Path.join(tmpDir, fileName);

  await Fs.writeFile(filePath, JSON.stringify(documents, null, 2), 'utf-8');
  logger.info(`Saved ${documents.length} documents to ${filePath}`);

  // Delete existing index if it exists
  await deleteIndex({
    indexName,
    client: esClient,
    log: logger,
  });

  // Create index with OpenAPI-specific mapping
  await createOpenAPIIndex({
    indexName,
    client: esClient,
    logger,
    inferenceId,
  });

  // Transform documents to index format and index them
  const transformedDocuments = transformDocumentsToIndexFormat(documents);

  await indexDocuments({
    index: indexName,
    client: esClient,
    documents: transformedDocuments as any,
    log: logger,
  });
}
