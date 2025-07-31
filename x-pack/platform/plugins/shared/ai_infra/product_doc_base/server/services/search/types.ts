/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';

/**
 * Options for the Product documentation {@link SearchApi}
 */
export interface DocSearchOptions {
  /** plain text search query */
  query: string;
  /** max number of hits. Defaults to 3 */
  max?: number;
  /** number of content highlights per hit. Defaults to 3 */
  highlights?: number;
  /** optional list of products to filter search */
  products?: ProductName[];
  /** optional inference ID to filter search */
  inferenceId?: string;
}

/**
 * Individual result returned in a {@link DocSearchResponse} by the {@link SearchApi}
 */
export interface DocSearchResult {
  /** title of the doc article page */
  title: string;
  /** full url to the online documentation */
  url: string;
  /** product name this document is associated to */
  productName: ProductName;
  /** full content of the doc article */
  content: string;
  /** content highlights based on the query */
  highlights: string[];
}

/**
 * Response for the {@link SearchApi}
 */
export interface DocSearchResponse {
  /** List of results for this search */
  results: DocSearchResult[];
}

/**
 * Search API to be used to retrieve product documentation.
 */
export type SearchApi = (options: DocSearchOptions) => Promise<DocSearchResponse>;
