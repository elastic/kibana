/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/agent-builder-server';
import {
  listDocumentResolvers,
  type DocumentResolution,
  type ResolvableDocument,
} from '@kbn/custom-app-registry';

/** What a resolver can use to finish a document: a model, the cluster as the user, and a logger. */
export interface DocumentResolverContext {
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  logger: Logger;
}

/** Runs the resolvers one after the other, and stops at the first that cannot finish the document. */
export const resolveDocument = async <Document extends ResolvableDocument>(
  requested: Document,
  context: DocumentResolverContext
): Promise<DocumentResolution<Document>> => {
  let document = requested;
  for (const resolver of listDocumentResolvers()) {
    const resolved = await (
      resolver as unknown as (
        document: ResolvableDocument,
        context: DocumentResolverContext
      ) => Promise<DocumentResolution<ResolvableDocument>>
    )(document, context);
    if ('error' in resolved) return resolved;
    document = resolved.document as Document;
  }
  return { document };
};
