/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { AppDocument } from '@kbn/custom-app-common';

/** What a resolver can use to finish a document: a model, the cluster as the user, and a logger. */
export interface DocumentResolverContext {
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  logger: Logger;
}

type ResolvableDocument = Pick<AppDocument, 'state' | 'root'> & Partial<AppDocument>;

/** What a resolver gives back: the document finished, or why it could not be. */
export type DocumentResolution<Document> = { document: Document } | { error: string };

/**
 * Finishes a document the agent wrote before it is checked and kept, for what only the capability
 * knows how to finish, such as turning a description into the content that it stands for.
 */
export type DocumentResolver = (
  document: ResolvableDocument,
  context: DocumentResolverContext
) => Promise<DocumentResolution<ResolvableDocument>>;

const resolvers: DocumentResolver[] = [];

/** Adds a resolver that runs on every document the agent makes or changes. */
export const registerDocumentResolver = (resolver: DocumentResolver): void => {
  if (!resolvers.includes(resolver)) resolvers.push(resolver);
};

/** Runs the resolvers one after the other, and stops at the first that cannot finish the document. */
export const resolveDocument = async <Document extends ResolvableDocument>(
  requested: Document,
  context: DocumentResolverContext
): Promise<DocumentResolution<Document>> => {
  let document = requested;
  for (const resolver of resolvers) {
    const resolved = await resolver(document, context);
    if ('error' in resolved) return resolved;
    document = resolved.document as Document;
  }
  return { document };
};
