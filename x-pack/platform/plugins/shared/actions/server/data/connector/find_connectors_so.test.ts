/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { findConnectorsSo } from './find_connectors_so';

const savedObjectsClient = savedObjectsClientMock.create();

describe('findConnectorsSo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      per_page: 10000,
      page: 1,
      saved_objects: [],
    });
  });

  it('passes fields to savedObjectsClient.find when provided', async () => {
    await findConnectorsSo({
      savedObjectsClient,
      namespace: 'space-1',
      fields: ['authMode'],
    });

    expect(savedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'action',
        perPage: 10000,
        namespaces: ['space-1'],
        fields: ['authMode'],
      })
    );
  });

  it('does not pass fields when not provided', async () => {
    await findConnectorsSo({
      savedObjectsClient,
      namespace: 'space-1',
    });

    const findCallArg = savedObjectsClient.find.mock.calls[0][0];
    expect(findCallArg).toEqual(
      expect.objectContaining({
        type: 'action',
        perPage: 10000,
        namespaces: ['space-1'],
      })
    );
    expect(findCallArg).not.toHaveProperty('fields');
  });
});
