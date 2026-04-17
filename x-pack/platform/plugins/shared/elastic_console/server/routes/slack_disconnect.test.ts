/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSlackDisconnectRoute } from './slack_disconnect';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';

const mockLogger = loggingSystemMock.create().get();

const KEY_ID = 'test-key-id';
const KIBANA_API_KEY = Buffer.from(`${KEY_ID}:test-secret`).toString('base64');

const createMocks = (overrides?: {
  getDecryptedResult?: unknown;
  getDecryptedError?: Error;
  invalidateError?: Error;
  deleteError?: Error;
}) => {
  const mockInvalidateApiKey = jest.fn().mockResolvedValue({});
  if (overrides?.invalidateError) {
    mockInvalidateApiKey.mockRejectedValue(overrides.invalidateError);
  }

  const mockDeleteSo = jest.fn().mockResolvedValue({});
  if (overrides?.deleteError) {
    mockDeleteSo.mockRejectedValue(overrides.deleteError);
  }

  const mockGetDecrypted = overrides?.getDecryptedError
    ? jest.fn().mockRejectedValue(overrides.getDecryptedError)
    : jest.fn().mockResolvedValue(
        overrides?.getDecryptedResult ?? {
          attributes: { kibana_api_key: KIBANA_API_KEY },
        }
      );

  const coreSetup = {
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: {
              security: { invalidateApiKey: mockInvalidateApiKey },
            },
          },
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue({ delete: mockDeleteSo }),
        },
      },
      {
        encryptedSavedObjects: {
          getClient: jest.fn().mockReturnValue({ getDecryptedAsInternalUser: mockGetDecrypted }),
        },
      },
    ]),
  };

  return { coreSetup, mockInvalidateApiKey, mockDeleteSo, mockGetDecrypted };
};

describe('registerSlackDisconnectRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  const registerAndGetHandler = (coreSetup: unknown) => {
    router = httpServiceMock.createRouter();
    registerSlackDisconnectRoute({ router, coreSetup: coreSetup as never, logger: mockLogger });
    const [, handler] = router.delete.mock.calls[0];
    return handler;
  };

  const callHandler = (handler: Function) => {
    const response = httpServerMock.createResponseFactory();
    return handler({} as never, httpServerMock.createKibanaRequest(), response).then(
      () => response
    );
  };

  it('registers a DELETE route at the correct path', () => {
    const { coreSetup } = createMocks();
    registerAndGetHandler(coreSetup);
    const [routeConfig] = router.delete.mock.calls[0];
    expect(routeConfig.path).toBe('/internal/elastic_console/slack/disconnect');
  });

  it('invalidates the stored API key by ID', async () => {
    const { coreSetup, mockInvalidateApiKey } = createMocks();
    const handler = registerAndGetHandler(coreSetup);
    await callHandler(handler);

    expect(mockInvalidateApiKey).toHaveBeenCalledWith({
      ids: [KEY_ID],
      owner: true,
    });
  });

  it('deletes the credentials saved object', async () => {
    const { coreSetup, mockDeleteSo } = createMocks();
    const handler = registerAndGetHandler(coreSetup);
    await callHandler(handler);

    expect(mockDeleteSo).toHaveBeenCalledWith(SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID);
  });

  it('returns ok: true on success', async () => {
    const { coreSetup } = createMocks();
    const handler = registerAndGetHandler(coreSetup);
    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
  });

  it('still deletes the SO even when key invalidation fails', async () => {
    const { coreSetup, mockDeleteSo } = createMocks({
      invalidateError: new Error('key not found'),
    });
    const handler = registerAndGetHandler(coreSetup);
    await callHandler(handler);

    expect(mockDeleteSo).toHaveBeenCalled();
  });

  it('still returns ok when credentials SO does not exist', async () => {
    const { coreSetup } = createMocks({
      getDecryptedError: new Error('saved object not found'),
    });
    const handler = registerAndGetHandler(coreSetup);
    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
  });

  it('still returns ok when SO deletion fails', async () => {
    const { coreSetup } = createMocks({ deleteError: new Error('delete failed') });
    const handler = registerAndGetHandler(coreSetup);
    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
  });
});
