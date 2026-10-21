/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';

import { appContextService } from '../../../app_context';

import { getSpaceAwareSaveobjectsClients } from './saved_objects';

jest.mock('../../../app_context');

describe('getSpaceAwareSaveobjectsClients', () => {
  it('return space scopped clients', () => {
    const soStartMock = savedObjectsServiceMock.createStartContract();
    const mockedSavedObjectTagging = {
      createInternalAssignmentService: jest.fn(),
      createTagClient: jest.fn(),
      getTagsFromReferences: jest.fn(),
      convertTagNameToId: jest.fn(),
      replaceTagReferences: jest.fn(),
    };

    const scoppedSoClient = savedObjectsClientMock.create();
    jest
      .mocked(appContextService.getInternalUserSOClientForSpaceId)
      .mockReturnValue(scoppedSoClient);

    jest.mocked(appContextService.getSavedObjects).mockReturnValue(soStartMock);
    jest.mocked(appContextService.getSavedObjectsTagging).mockReturnValue(mockedSavedObjectTagging);

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
