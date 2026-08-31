/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ResolvedConfiguration {
  instructions: string;
  /**
   * Context Engine ids of the AI indices this agent may use. These are ids, not Elasticsearch
   * index names.
   */
  aiIndices: string[];
}
