/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response from ML node count query
 */
export interface MlNodeCountResponse {
  /**
   * Count of dedicated ML nodes
   */
  count: number;
  
  /**
   * Count of lazy ML nodes
   */
  lazyNodeCount: number;
}

/**
 * Options for getting ML node count
 */
export interface MlNodeCountOptions {
  /**
   * The Elasticsearch client
   */
  client: {
    asCurrentUser: Record<string, any>;
  };
}
