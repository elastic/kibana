/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import {
  createInternalSavedObjectsClientForSpaceId,
  getInternalSavedObjectsClient,
  getInternalSavedObjectsClientForSpaceId,
} from './get_internal_saved_object_client';

describe('get_internal_saved_object_client', () => {
  const createCoreStartMock = () => {
    const coreStart = coreMock.createStart();
    const mockScopedClient = { scoped: true };

    coreStart.savedObjects.createInternalRepository = jest.fn();
    coreStart.savedObjects.getScopedClient = jest.fn().mockReturnValue(mockScopedClient);
    coreStart.http.basePath.set = jest.fn();

    return coreStart;
  };

  it('creates internal saved objects client using internal repository', async () => {
    const coreStart = createCoreStartMock();

    await getInternalSavedObjectsClient(coreStart);

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
  });

  it('returns scoped client without setting base path for default space', () => {
    const coreStart = createCoreStartMock();

    const client = getInternalSavedObjectsClientForSpaceId(coreStart, DEFAULT_SPACE_ID);

    expect(coreStart.http.basePath.set).not.toHaveBeenCalled();
    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(expect.any(Object), {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
    expect(client).toEqual({ scoped: true });
  });

  it('sets base path for non-default space', () => {
    const coreStart = createCoreStartMock();

    getInternalSavedObjectsClientForSpaceId(coreStart, 'space-a');

    expect(coreStart.http.basePath.set).toHaveBeenCalledWith(expect.any(Object), '/s/space-a');
  });

  it('creates internal scoped client for active space', async () => {
    const coreStart = createCoreStartMock();
    const request = httpServerMock.createKibanaRequest();
    const osqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'space-a' }),
      },
      getStartServices: jest.fn().mockResolvedValue([coreStart]),
    };

    const client = await createInternalSavedObjectsClientForSpaceId(osqueryContext, request);

    expect(osqueryContext.service.getActiveSpace).toHaveBeenCalledWith(request);
    expect(client).toEqual({ scoped: true });
  });
});
