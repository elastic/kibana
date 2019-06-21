/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesServiceSetup } from './spaces_service';
import { spacesClientMock } from '../../lib/spaces_client/spaces_client.mock';
import { DEFAULT_SPACE_ID } from '../../../common/constants';

const createSetupContractMock = (spaceId = DEFAULT_SPACE_ID) => {
  const setupContract: SpacesServiceSetup = {
    getSpaceId: jest.fn().mockReturnValue(spaceId),
    isInDefaultSpace: jest.fn().mockReturnValue(spaceId === DEFAULT_SPACE_ID),
    scopedClient: jest.fn().mockResolvedValue(spacesClientMock.create()),
  };
  return setupContract;
};

export const spacesServiceMock = {
  createSetupContract: createSetupContractMock,
};
