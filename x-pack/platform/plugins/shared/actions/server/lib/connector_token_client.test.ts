/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { ConnectorTokenClient } from './connector_token_client';
import { Logger } from '@kbn/core/server';
import { ConnectorToken } from '../types';
import * as allRetry from './retry_if_conflicts';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();

let connectorTokenClient: ConnectorTokenClient;

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
});
beforeEach(() => {
  clock.reset();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  connectorTokenClient = new ConnectorTokenClient({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
  });
});
afterAll(() => clock.restore());

describe('create()', () => {
  test('creates connector_token with all given properties', async () => {
    const expiresAt = new Date().toISOString();
    const savedObjectCreateResult = {
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      },
      references: [],
    };

    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    const result = await connectorTokenClient.create({
      connectorId: '123',
      expiresAtMillis: expiresAt,
      token: 'testtokenvalue',
    });
    expect(result).toEqual({
      connectorId: '123',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAt,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
      'testtokenvalue'
    );
  });
});

describe('get()', () => {
  test('calls unsecuredSavedObjectsClient with parameters', async () => {
    const expiresAt = new Date().toISOString();
    const createdAt = new Date().toISOString();
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt,
            expiresAt,
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      references: [],
      attributes: {
        token: 'testtokenvalue',
      },
    });
    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });
    expect(result).toEqual({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt,
        expiresAt,
      },
    });
  });

  test('return null if there is not tokens for connectorId', async () => {
    const expectedResult = {
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });
    expect(result).toEqual({ connectorToken: null, hasErrors: false });
  });

  test('return null and log the error if unsecuredSavedObjectsClient throws an error', async () => {
    unsecuredSavedObjectsClient.find.mockRejectedValueOnce(new Error('Fail'));

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });

    expect(logger.error.mock.calls[0]).toMatchObject([
      `Failed to fetch connector_token for connectorId "123" and tokenType: "access_token". Error: Fail`,
    ]);
    expect(result).toEqual({ connectorToken: null, hasErrors: true });
  });

  test('return null and log the error if encryptedSavedObjectsClient decrypt method throws an error', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });

    expect(logger.error.mock.calls[0]).toMatchObject([
      `Failed to decrypt connector_token for connectorId "123" and tokenType: "access_token". Error: Fail`,
    ]);
    expect(result).toEqual({ connectorToken: null, hasErrors: true });
  });

  test('return null and log the error if expiresAt is NaN', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: 'yo',
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      references: [],
      attributes: {
        token: 'testtokenvalue',
      },
    });

    const result = await connectorTokenClient.get({
      connectorId: '123',
      tokenType: 'access_token',
    });

    expect(logger.error.mock.calls[0]).toMatchObject([
      `Failed to get connector_token for connectorId "123" and tokenType: "access_token". Error: expiresAt is not a valid Date "yo"`,
    ]);
    expect(result).toEqual({ connectorToken: null, hasErrors: true });
  });
});

describe('update()', () => {
  test('updates the connector token with all given properties', async () => {
    const expiresAt = new Date().toISOString();

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt,
      },
      references: [],
    });
    unsecuredSavedObjectsClient.checkConflicts.mockResolvedValueOnce({
      errors: [],
    });
    const result = await connectorTokenClient.update({
      id: '1',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAtMillis: expiresAt,
    });
    expect(result).toEqual({
      connectorId: '123',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAt,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
      'testtokenvalue'
    );
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "1",
      ]
    `);
  });

  test('should log error, when failed to update the connector token if there are a conflict errors', async () => {
    const expiresAt = new Date().toISOString();

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    const retryIfConflictsMock = jest.spyOn(allRetry, 'retryIfConflicts');
    retryIfConflictsMock.mockRejectedValue(new Error('There is a conflict.'));
    await expect(
      connectorTokenClient.update({
        id: '1',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAtMillis: expiresAt,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"There is a conflict."`);
    expect(logger.error.mock.calls[0]).toMatchObject([
      'Failed to update connector_token for id "1" and tokenType: "access_token". Error: There is a conflict.',
    ]);
  });

  test('should attempt oper', async () => {
    const expiresAt = new Date().toISOString();

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    const retryIfConflictsMock = jest.spyOn(allRetry, 'retryIfConflicts');
    retryIfConflictsMock.mockRejectedValue(new Error('There is a conflict.'));
    await expect(
      connectorTokenClient.update({
        id: '1',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAtMillis: expiresAt,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"There is a conflict."`);
    expect(logger.error.mock.calls[0]).toMatchObject([
      'Failed to update connector_token for id "1" and tokenType: "access_token". Error: There is a conflict.',
    ]);
  });

  test('throws an error when unsecuredSavedObjectsClient throws', async () => {
    const expiresAt = new Date().toISOString();
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });
    unsecuredSavedObjectsClient.checkConflicts.mockResolvedValueOnce({
      errors: [],
    });
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));
    await expect(
      connectorTokenClient.update({
        id: 'my-action',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAtMillis: expiresAt,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

describe('delete()', () => {
  test('calls unsecuredSavedObjectsClient delete for all connector token records by connectorId', async () => {
    const expectedResult = Symbol();
    unsecuredSavedObjectsClient.delete.mockResolvedValue(expectedResult);

    const findResult = {
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: 'token1',
          type: 'connector_token',
          attributes: {
            connectorId: '1',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
        {
          id: 'token2',
          type: 'connector_token',
          attributes: {
            connectorId: '1',
            tokenType: 'refresh_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(findResult);
    const result = await connectorTokenClient.deleteConnectorTokens({ connectorId: '1' });
    expect(JSON.stringify(result)).toEqual(JSON.stringify([Symbol(), Symbol()]));
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(2);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "token1",
      ]
    `);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "connector_token",
        "token2",
      ]
    `);
  });
});

describe('updateOrReplace()', () => {
  test('creates new SO if current token is null', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt: new Date().toISOString(),
      },
      references: [],
    });
    await connectorTokenClient.updateOrReplace({
      connectorId: '1',
      token: null,
      newToken: 'newToken',
      tokenRequestDate: undefined as unknown as number,
      expiresInSec: 1000,
      deleteExisting: false,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'connector_token',
      {
        connectorId: '1',
        createdAt: '2021-01-01T12:00:00.000Z',
        expiresAt: '2021-01-01T12:16:40.000Z',
        token: 'newToken',
        tokenType: 'access_token',
        updatedAt: '2021-01-01T12:00:00.000Z',
      },
      { id: 'mock-saved-object-id' }
    );

    expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.delete).not.toHaveBeenCalled();
  });

  test('uses tokenRequestDate to determine expire time if provided', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
      },
      references: [],
    });
    await connectorTokenClient.updateOrReplace({
      connectorId: '1',
      token: null,
      newToken: 'newToken',
      tokenRequestDate: new Date('2021-03-03T00:00:00.000Z').getTime(),
      expiresInSec: 1000,
      deleteExisting: false,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'connector_token',
      {
        connectorId: '1',
        createdAt: '2021-01-01T12:00:00.000Z',
        expiresAt: '2021-03-03T00:16:40.000Z',
        token: 'newToken',
        tokenType: 'access_token',
        updatedAt: '2021-01-01T12:00:00.000Z',
      },
      { id: 'mock-saved-object-id' }
    );

    expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.delete).not.toHaveBeenCalled();
  });

  test('creates new SO and deletes all existing tokens for connector if current token is null and deleteExisting is true', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt: new Date().toISOString(),
      },
      references: [],
    });
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
        {
          id: '2',
          type: 'connector_token',
          attributes: {
            connectorId: '123',
            tokenType: 'access_token',
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
      ],
    });
    await connectorTokenClient.updateOrReplace({
      connectorId: '1',
      token: null,
      newToken: 'newToken',
      tokenRequestDate: Date.now(),
      expiresInSec: 1000,
      deleteExisting: true,
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
      'newToken'
    );

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(2);
  });

  test('updates existing SO if current token exists', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
      },
      references: [],
    });

    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'connector_token',
      attributes: {
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        expiresAt: new Date().toISOString(),
      },
      references: [],
    });
    await connectorTokenClient.updateOrReplace({
      connectorId: '1',
      token: {
        id: '3',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      },
      newToken: 'newToken',
      tokenRequestDate: Date.now(),
      expiresInSec: 1000,
      deleteExisting: true,
    });

    expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.delete).not.toHaveBeenCalled();

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect((unsecuredSavedObjectsClient.create.mock.calls[0][1] as ConnectorToken).token).toBe(
      'newToken'
    );
  });
});
