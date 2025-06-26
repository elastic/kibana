/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../services/ml_server_info';
import type { MlApi } from '../services/ml_api_service';

export interface Resolvers {
  [name: string]: (mlApi: MlApi) => Promise<any>;
}
export type ResolverResults =
  | {
      [name: string]: any;
    }
  | undefined;

export const basicResolvers = (): Resolvers => ({
  getMlNodeCount,
  loadMlServerInfo,
});

export const initSavedObjects = async (mlApi: MlApi) => {
  return mlApi.savedObjects.initSavedObjects().catch(() => {});
};
