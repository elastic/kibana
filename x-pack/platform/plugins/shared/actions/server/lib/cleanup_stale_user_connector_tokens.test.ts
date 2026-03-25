/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import { cleanupStaleUserConnectorTokens } from './cleanup_stale_user_connector_tokens';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers(new Date('2026-01-01T12:00:00.000Z'));
});
beforeEach(() => {
  clock.reset();
  jest.resetAllMocks();
  jest.restoreAllMocks();
});
afterAll(() => clock.restore());

describe('cleanupStaleUserConnectorTokens()', () => {
  const mockFinder = {
    find: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockFinder.find.mockReset();
    mockFinder.close.mockResolvedValue(undefined);
    unsecuredSavedObjectsClient.createPointInTimeFinder.mockReturnValue(mockFinder);
  });

  test('deletes stale tokens and returns count', async () => {
    const staleObjects = [
      { id: 'stale-token-1', type: 'user_connector_token' },
      { id: 'stale-token-2', type: 'user_connector_token' },
    ];

    mockFinder.find.mockImplementation(async function* () {
      yield { saved_objects: staleObjects };
    });

    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'stale-token-1', type: 'user_connector_token', success: true },
        { id: 'stale-token-2', type: 'user_connector_token', success: true },
      ],
    });

    const result = await cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient, logger);

    expect(result).toBe(2);
    expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user_connector_token',
        filter: expect.stringMatching(/user_connector_token\.updated_at < "/),
        perPage: 100,
      })
    );
    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      { type: 'user_connector_token', id: 'stale-token-1' },
      { type: 'user_connector_token', id: 'stale-token-2' },
    ]);
    expect(mockFinder.close).toHaveBeenCalled();
  });

  test('returns 0 when no stale tokens found', async () => {
    mockFinder.find.mockImplementation(async function* () {
      yield { saved_objects: [] };
    });

    const result = await cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient, logger);

    expect(result).toBe(0);
    expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  test('uses cutoff date 90 days in the past', async () => {
    mockFinder.find.mockImplementation(async function* () {
      yield { saved_objects: [] };
    });

    const expectedCutoff = new Date(clock.now - 90 * 24 * 60 * 60 * 1000).toISOString();
    await cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient, logger);

    const callArg = unsecuredSavedObjectsClient.createPointInTimeFinder.mock.calls[0][0] as {
      filter: string;
    };
    expect(callArg.filter).toContain(expectedCutoff);
  });

  test('returns 0 and logs error when generator throws', async () => {
    mockFinder.find.mockImplementation(async function* () {
      throw new Error('ES error');
    });

    const result = await cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient, logger);

    expect(result).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup stale user connector tokens')
    );
  });

  test('returns 0 and logs error when createPointInTimeFinder throws', async () => {
    unsecuredSavedObjectsClient.createPointInTimeFinder.mockImplementation(() => {
      throw new Error('finder failed');
    });

    const result = await cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient, logger);

    expect(result).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup stale user connector tokens')
    );
  });

  test('accumulates count across multiple pages', async () => {
    mockFinder.find.mockImplementation(async function* () {
      yield { saved_objects: [{ id: 'token-1' }, { id: 'token-2' }] };
      yield { saved_objects: [{ id: 'token-3' }] };
    });

    unsecuredSavedObjectsClient.bulkDelete
      .mockResolvedValueOnce({
        statuses: [
          { id: 'token-1', type: 'user_connector_token', success: true },
          { id: 'token-2', type: 'user_connector_token', success: true },
        ],
      })
      .mockResolvedValueOnce({
        statuses: [{ id: 'token-3', type: 'user_connector_token', success: true }],
      });

    const result = await cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient, logger);

    expect(result).toBe(3);
    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(2);
  });
});
