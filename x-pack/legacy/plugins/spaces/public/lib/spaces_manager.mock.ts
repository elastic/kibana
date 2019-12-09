/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function createSpacesManagerMock() {
  return {
    getSpaces: jest.fn().mockResolvedValue([]),
    getSpace: jest.fn().mockResolvedValue(undefined),
    createSpace: jest.fn().mockResolvedValue(undefined),
    updateSpace: jest.fn().mockResolvedValue(undefined),
    deleteSpace: jest.fn().mockResolvedValue(undefined),
    copySavedObjects: jest.fn().mockResolvedValue(undefined),
    resolveCopySavedObjectsErrors: jest.fn().mockResolvedValue(undefined),
    redirectToSpaceSelector: jest.fn().mockResolvedValue(undefined),
    requestRefresh: jest.fn(),
    on: jest.fn(),
  };
}

export const spacesManagerMock = {
  create: createSpacesManagerMock,
};
