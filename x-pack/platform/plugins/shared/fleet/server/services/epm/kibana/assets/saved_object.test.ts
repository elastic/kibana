/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { savedObjectsClientMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';

import { appContextService } from '../../../app_context';

import { getSpaceAwareSaveobjectsClients } from './saved_objects';

vi.mock('../../../app_context');

describe('getSpaceAwareSaveobjectsClients', () => {
  it('return space scopped clients', () => {
    const soStartMock = savedObjectsServiceMock.createStartContract();
    const mockedSavedObjectTagging = {
      createInternalAssignmentService: vi.fn(),
      createTagClient: vi.fn(),
      getTagsFromReferences: vi.fn(),
      convertTagNameToId: vi.fn(),
      replaceTagReferences: vi.fn(),
    };

    const scoppedSoClient = savedObjectsClientMock.create();
    vi
      .mocked(appContextService.getInternalUserSOClientForSpaceId)
      .mockReturnValue(scoppedSoClient);

    vi.mocked(appContextService.getSavedObjects).mockReturnValue(soStartMock);
    vi.mocked(appContextService.getSavedObjectsTagging).mockReturnValue(mockedSavedObjectTagging);

    getSpaceAwareSaveobjectsClients('test1');

    expect(appContextService.getInternalUserSOClientForSpaceId).toHaveBeenCalledWith('test1');
    expect(soStartMock.createImporter).toHaveBeenCalledWith(scoppedSoClient, expect.anything());
    expect(mockedSavedObjectTagging.createInternalAssignmentService).toHaveBeenCalledWith({
      client: scoppedSoClient,
    });
    expect(mockedSavedObjectTagging.createTagClient).toHaveBeenCalledWith({
      client: scoppedSoClient,
    });
  });
});
