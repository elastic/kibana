/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FunctionCallingMode } from '@kbn/inference-common';
import type { ProductName, ResourceType } from '@kbn/product-doc-common';

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
   * Optional resource types to include in the search.
   * Defaults to product documentation.
   */
  resourceTypes?: ResourceType[];
  /**
   * The maximum number of tokens to return *per document*.
   * Documents exceeding this limit will go through token reduction.
   *
   * Defaults to `1000`.
   */
  maxDocumentTokens?: number;
  /**
   * The token reduction strategy to apply for documents exceeding max token count.
   * - "highlight": Use Elasticsearch semantic highlighter to build a summary (concatenating highlights)
   * - "truncate": Will keep the N first tokens
   * - "summarize": Will call the LLM asking to generate a contextualized summary of the document
   *
   * Overall, `summarize` is more efficient, but significantly slower, given that an additional
   * LLM call will be performed.
   *
   * Defaults to `highlight`
   */
  tokenReductionStrategy?: 'highlight' | 'truncate' | 'summarize';
  /**
   * The request that initiated the task.
   */
  request: KibanaRequest;
  /**
   * Id of the LLM connector to use for the task.
   */
  connectorId: string;
  /**
   * Optional functionCalling parameter to pass down to the inference APIs.
   */
  functionCalling?: FunctionCallingMode;
  /**
   * Inferece ID to route the request to the right index to perform the search.
   */
  inferenceId: string;
}

/**
 * Individual result item in a {@link RetrieveDocumentationResult}
 */
export interface RetrieveDocumentationResultDoc {
  /** title of the document */
  title: string;
  /** full url to the online documentation */
  url: string;
  /** full content of the doc article */
  content: string;
  /** true if content exceeded max token length and had to go through token reduction */
  summarized: boolean;
}

/**
 * Response type for {@link RetrieveDocumentationAPI}
 */
export interface RetrieveDocumentationResult {
  /** whether the call was successful or not */
  success: boolean;
  /** List of results for this search */
  documents: RetrieveDocumentationResultDoc[];
}

/**
 * Retrieve documentation API
 */
export type RetrieveDocumentationAPI = (
  options: RetrieveDocumentationParams
) => Promise<RetrieveDocumentationResult>;
