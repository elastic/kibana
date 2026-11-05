/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../..';
import { mockedDateString, setGlobalDate } from '../../rules_client/tests/lib';
import { bulkMarkApiKeysForInvalidation } from './bulk_mark_api_keys_for_invalidation';

const encode = (value: string) => Buffer.from(value).toString('base64');

const SKIP_WARNING =
  'Skipping invalidation for a user-created UIAM API key; user-created API keys are not managed by alerting.';

setGlobalDate();

describe('bulkMarkApiKeysForInvalidation characterization', () => {
  let unsecuredSavedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<ReturnType<typeof loggingSystemMock.create>['get']>;

  const run = (apiKeys: string[]) =>
    bulkMarkApiKeysForInvalidation({ apiKeys }, logger, unsecuredSavedObjectsClient);

  beforeEach(() => {
    unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: [] });
    logger = loggingSystemMock.create().get();
  });

  test('writes only apiKeyId and createdAt for an ES base64(id:secret) key', async () => {
    await run([encode('es-id:es-secret')]);

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'es-id', createdAt: mockedDateString },
        },
      ],
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('stores the decoded essu_ secret as uiamApiKey for a base64(id:essu_) key', async () => {
    await run([encode('uiam-id:essu_secret')]);

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: {
            apiKeyId: 'uiam-id',
            createdAt: mockedDateString,
            uiamApiKey: 'essu_secret',
          },
        },
      ],
    ]);
  });

  test('drops raw essu_ keys, warning once per dropped key, and keeps input order for the rest', async () => {
    await run([
      'essu_raw_1',
      encode('es-id:es-secret'),
      'essu_raw_2',
      encode('uiam-id:essu_secret'),
    ]);

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'es-id', createdAt: mockedDateString },
        },
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: {
            apiKeyId: 'uiam-id',
            createdAt: mockedDateString,
            uiamApiKey: 'essu_secret',
          },
        },
      ],
    ]);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenNthCalledWith(1, SKIP_WARNING);
    expect(logger.warn).toHaveBeenNthCalledWith(2, SKIP_WARNING);
  });

  test('does not call bulkCreate when only raw essu_ keys are passed', async () => {
    await run(['essu_raw_1', 'essu_raw_2']);

    expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  test('does not de-duplicate repeated keys (current behavior)', async () => {
    const key = encode('es-id:es-secret');
    await run([key, key]);

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'es-id', createdAt: mockedDateString },
        },
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'es-id', createdAt: mockedDateString },
        },
      ],
    ]);
  });

  test('uses the whole decoded value as apiKeyId when there is no colon (current behavior)', async () => {
    await run([encode('only-an-id')]);

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: 'only-an-id', createdAt: mockedDateString },
        },
      ],
    ]);
  });

  test('ignores segments after the second colon (current behavior)', async () => {
    await run([encode('uiam-id:essu_secret:extra')]);

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: {
            apiKeyId: 'uiam-id',
            createdAt: mockedDateString,
            uiamApiKey: 'essu_secret',
          },
        },
      ],
    ]);
  });

  test('queues an empty apiKeyId for base64(:essu_) (current behavior)', async () => {
    await run([encode(':essu_secret')]);

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toEqual([
      [
        {
          type: API_KEY_PENDING_INVALIDATION_TYPE,
          attributes: { apiKeyId: '', createdAt: mockedDateString, uiamApiKey: 'essu_secret' },
        },
      ],
    ]);
  });

  test('logs only decodable key ids when bulkCreate fails and does not throw', async () => {
    const error = new Error('Fail');
    unsecuredSavedObjectsClient.bulkCreate.mockRejectedValueOnce(error);

    await expect(
      run(['essu_raw', encode('es-id:es-secret'), encode('uiam-id:essu_secret')])
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to bulk mark list of API keys ["es-id", "uiam-id"] for invalidation: Fail',
      { error: { stack_trace: error.stack } }
    );
  });
});
