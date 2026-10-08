/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IClusterClient, KibanaRequest } from '@kbn/core/server';

export const getReadEsClient = (
  clusterClient: IClusterClient,
  request: KibanaRequest,
  cpsActive: boolean
): ElasticsearchClient => {
  if (cpsActive) {
    return clusterClient.asScoped(request, { projectRouting: 'space' }).asCurrentUser;
  }

  return clusterClient.asInternalUser;
};
