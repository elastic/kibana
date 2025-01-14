/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FunctionCallingMode } from '@kbn/inference-common';
import type { ProductName } from '@kbn/product-doc-common';

/**
 * Parameters for {@link RetrieveDocumentationAPI}
 */
export interface RetrieveDocumentationParams {
  /**
   * The search term to perform semantic text with.
   * E.g. "What is Kibana Lens?"
   */
  searchTerm: string;
  /**
   * Maximum number of documents to return.
   * Defaults to 3.
   */
  max?: number;
  /**
   * Optional list of products to restrict the search to.
   */
  products?: ProductName[];
  /**
   * The maximum number of tokens to return *per document*.
   * Documents exceeding this limit will go through token reduction.
   *
   * Defaults to `1000`.
   */
  maxDocumentTokens?: number;
  /**
   * The token reduction strategy to apply for documents exceeding max token count.
   * - truncate: Will keep the N first tokens
   * - summarize: Will call the LLM asking to generate a contextualized summary of the document
   *
   * Overall, `summarize` is way more efficient, but significantly slower, given that an additional
   * LLM call will be performed.
   *
   * Defaults to `summarize`
   */
  tokenReductionStrategy?: 'truncate' | 'summarize';
  /**
   * The request that initiated the task.
   */
  request: KibanaRequest;
  /**
   * Id of the LLM connector to use for the task.
   */
  connectorId: string;
  functionCalling?: FunctionCallingMode;
}

export interface RetrievedDocument {
  title: string;
  url: string;
  content: string;
}

export interface RetrieveDocumentationResult {
  success: boolean;
  documents: RetrievedDocument[];
}

export type RetrieveDocumentationAPI = (
  options: RetrieveDocumentationParams
) => Promise<RetrieveDocumentationResult>;
