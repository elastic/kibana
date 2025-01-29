/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { RelatedState, ChatModels } from '../../types';

export interface RelatedBaseNodeParams {
  state: RelatedState;
}

export interface RelatedNodeParams extends RelatedBaseNodeParams {
  model: ChatModels;
}

export interface RelatedGraphParams {
  client: IScopedClusterClient;
  model: ChatModels;
}
