/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { EcsMappingState, ChatModels } from '../../types';

export interface EcsBaseNodeParams {
  state: EcsMappingState;
}

export interface EcsCreatePipelineNodeParams extends EcsBaseNodeParams {
  client: IScopedClusterClient;
}
export interface EcsNodeParams extends EcsBaseNodeParams {
  model: ChatModels;
}

export interface EcsGraphParams {
  model: ChatModels;
  client: IScopedClusterClient;
}

export interface EcsSubGraphParams {
  model: ChatModels;
}
