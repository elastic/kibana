/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, Observable } from 'rxjs';
import { Space } from '../../common/model/space';
import { SpacesManager } from './spaces_manager';

function createSpacesManagerMock() {
  return ({
    onActiveSpaceChange$: (of(undefined) as unknown) as Observable<Space>,
    getSpaces: jest.fn().mockResolvedValue([]),
    getSpace: jest.fn().mockResolvedValue(undefined),
    getActiveSpace: jest.fn().mockResolvedValue(undefined),
    createSpace: jest.fn().mockResolvedValue(undefined),
    updateSpace: jest.fn().mockResolvedValue(undefined),
    deleteSpace: jest.fn().mockResolvedValue(undefined),
    copySavedObjects: jest.fn().mockResolvedValue(undefined),
    resolveCopySavedObjectsErrors: jest.fn().mockResolvedValue(undefined),
    redirectToSpaceSelector: jest.fn().mockResolvedValue(undefined),
    changeSelectedSpace: jest.fn(),
  } as unknown) as jest.Mocked<SpacesManager>;
}

export const spacesManagerMock = {
  create: createSpacesManagerMock,
};
