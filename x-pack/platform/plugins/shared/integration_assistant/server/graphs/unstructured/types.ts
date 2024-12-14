/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { UnstructuredLogState, ChatModels } from '../../types';

export interface UnstructuredBaseNodeParams {
  state: UnstructuredLogState;
}

export interface UnstructuredNodeParams extends UnstructuredBaseNodeParams {
  model: ChatModels;
}

export interface UnstructuredGraphParams {
  client: IScopedClusterClient;
  model: ChatModels;
}

export interface HandleUnstructuredNodeParams extends UnstructuredNodeParams {
  client: IScopedClusterClient;
}

export interface GrokResult {
  grok_patterns: string[];
  message: string;
}

export interface LogResult {
  [packageName: string]: { [dataStreamName: string]: unknown };
}
