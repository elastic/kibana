/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericNode } from '.';

/** A document as a resolver sees it: any node, since each resolver only knows its own. */
export interface ResolvableDocument {
  state: Record<string, unknown>;
  root: GenericNode;
  theme?: unknown;
}

/** What a resolver gives back: the document finished, or why it could not be. */
export type DocumentResolution<Document> = { document: Document } | { error: string };

/**
 * Finishes a document that an agent wrote before it is checked and kept, for what only a
 * capability knows how to finish, such as turning a description into the content it stands for.
 * What it can use, such as a model or the cluster, is given by whoever runs it.
 */
export type DocumentResolver<Context = never> = (
  document: ResolvableDocument,
  context: Context
) => Promise<DocumentResolution<ResolvableDocument>>;
