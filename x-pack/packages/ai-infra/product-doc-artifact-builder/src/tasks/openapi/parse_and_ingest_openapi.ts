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

interface Document extends OpenAPIV3.OperationObject {
  path: string;
  method: string;
  'x-codeSamples'?: {
    lang: string;
    source: string;
  }[];
}

/**
 * Resolves $refs in an OpenAPI operation object by replacing references with their resolved content.
 */
function resolveOperationRefs(
  operation: OpenAPIV3.OperationObject,
  spec: OpenAPIV3.Document,
  excludeKeys: string[] = []
): OpenAPIV3.OperationObject {
  const resolvedCache = new Map<string, unknown>();
  const excludeKeySet = new Set(excludeKeys);

  function resolveRef(ref: string): unknown {
    if (!ref.startsWith('#/')) {
      return null; // Skip external refs (e.g., URLs)
    }

    const segments = ref.slice(2).split('/');
    let current: unknown = spec;

    for (const segment of segments) {
      if (typeof current !== 'object' || current === null) {
        return null;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    if (typeof current !== 'object' || current === null) {
      return null;
    }

    return current;
  }

  function recursiveResolve(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => recursiveResolve(item));
    }

    const objRecord = obj as Record<string, unknown>;

    // Handle $ref - resolve and replace with referenced content
    if ('$ref' in objRecord && typeof objRecord.$ref === 'string') {
      const ref = objRecord.$ref;

      // Return cached result if already resolved
      if (resolvedCache.has(ref)) {
        return resolvedCache.get(ref);
      }

      const resolved = resolveRef(ref);
      if (resolved) {
        const finalResolved = recursiveResolve(resolved);
        resolvedCache.set(ref, finalResolved); // Cache the resolved result
        return finalResolved;
      }
      return objRecord;
    }

    // Traverse object and resolve nested values
    let hasChanges = false;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(objRecord)) {
      // Skip excluded keys - they are returned as-is without resolving references
      const resolvedValue = excludeKeySet.has(key) ? value : recursiveResolve(value);
      result[key] = resolvedValue;

      if (resolvedValue !== value) {
        hasChanges = true;
      }
    }

    // Only return new object if something actually changed
    return hasChanges ? result : objRecord;
  }

  return recursiveResolve(operation) as OpenAPIV3.OperationObject;
}

function generateDocuments(openApiSpec: OpenAPIV3.Document, logger: ToolingLog): Document[] {
  logger.info(`Resolving OpenAPI references...`);

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

        // Resolve references in operation specs, excluding responses and requestBody
        const resolvedOperation = resolveOperationRefs(operation, openApiSpec, [
          'responses',
          'requestBody',
        ]);

        return JSON.parse(JSON.stringify({ ...resolvedOperation, path, method }));
      });
    })
    .flat();

  logger.info(`Resolved ${documents.length} OpenAPI operations`);
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
        'x-codeSamples': {
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
  const textFields = ['description', 'summary', 'endpoint', 'operationId'];

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
      // Store complete data for tool generation (but don't index deeply)
      parameters: doc.parameters ?? [],
      responses: doc.responses ?? {},
      'x-codeSamples': doc['x-codeSamples'] ?? [],
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
  const documents = generateDocuments(openApiSpec, logger);

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
