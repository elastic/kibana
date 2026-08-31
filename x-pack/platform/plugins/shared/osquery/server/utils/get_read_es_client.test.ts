/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getReadEsClient } from './get_read_es_client';

describe('getReadEsClient', () => {
  const request = httpServerMock.createKibanaRequest();
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  clusterClient.asScoped.mockReturnValue(scopedClusterClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns asInternalUser when CPS is disabled', () => {
    const client = getReadEsClient(clusterClient, request, false);

    expect(client).toBe(clusterClient.asInternalUser);
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
  });

  it('returns scoped asCurrentUser when CPS is enabled', () => {
    const client = getReadEsClient(clusterClient, request, true);

    expect(clusterClient.asScoped).toHaveBeenCalledWith(request, { projectRouting: 'space' });
    expect(client).toBe(scopedClusterClient.asCurrentUser);
  });
});
