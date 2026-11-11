/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { InferenceSetupDependencies } from './types';
import { InferencePlugin, resolveReplacementsEncryptionKey } from './plugin';
import { createChatModel, createClient } from './inference_client';

jest.mock('./inference_client', () => ({
  ...jest.requireActual('./inference_client'),
  createClient: jest.fn(),
  createChatModel: jest.fn(),
}));

const createClientMock = jest.mocked(createClient);
const createChatModelMock = jest.mocked(createChatModel);

describe('resolveReplacementsEncryptionKey', () => {
  it('returns undefined when anonymization is disabled', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: false,
      })
    ).resolves.toBeUndefined();
  });

  it('returns policy-managed key when anonymization is enabled', async () => {
    const getReplacementsEncryptionKey = jest.fn().mockResolvedValue('managed-key');

    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
        policyService: { getReplacementsEncryptionKey },
      })
    ).resolves.toBe('managed-key');
  });

  it('returns undefined when policy service is unavailable', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
      })
    ).resolves.toBeUndefined();
  });
});

const createPlugin = () =>
  new InferencePlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      workers: {
        anonymization: {
          enabled: false,
          minThreads: 0,
          maxThreads: 3,
          maxQueue: 20,
          idleTimeout: moment.duration(30, 'seconds'),
          taskTimeout: moment.duration(15, 'seconds'),
        },
      },
    })
  );

const setupDependencies = { actions: {} } as unknown as InferenceSetupDependencies;

describe('InferencePlugin.start', () => {
  const request = httpServerMock.createKibanaRequest();
  const settingsError = new Error('unable to authenticate with provided credentials');

  const startPlugin = async (coreStart: ReturnType<typeof coreMock.createStart>) => {
    const plugin = createPlugin();
    plugin.setup(coreMock.createSetup(), setupDependencies);
    const inferenceStart = plugin.start(coreStart, { actions: actionsMock.createStart() });
    await plugin.stop();
    return inferenceStart;
  };

  const createCoreStartWithFailingSettings = () => {
    const coreStart = coreMock.createStart();
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
      coreStart.savedObjects.getScopedClient(request)
    );
    jest.mocked(uiSettingsClient.get).mockRejectedValue(settingsError);
    return coreStart;
  };

  afterEach(() => {
    createClientMock.mockReset();
    createChatModelMock.mockReset();
  });

  describe('getClient when the anonymization settings cannot be read', () => {
    const getClientOptions = async () => {
      const inferenceStart = await startPlugin(createCoreStartWithFailingSettings());
      inferenceStart.getClient({ request });
      expect(createClientMock).toHaveBeenCalledTimes(1);
      return createClientMock.mock.calls[0][0];
    };

    it('does not leave an unhandled rejection when the client is never used', async () => {
      await getClientOptions();

      await new Promise((resolve) => setImmediate(resolve));
    });

    it('still rejects with the settings error when the anonymization rules are awaited', async () => {
      const { anonymizationRulesPromise } = await getClientOptions();

      await expect(anonymizationRulesPromise).rejects.toBe(settingsError);
    });
  });

  describe('getChatModel when the anonymization settings cannot be read', () => {
    const getChatModelOptions = async () => {
      const inferenceStart = await startPlugin(createCoreStartWithFailingSettings());
      await inferenceStart.getChatModel({
        request,
        connectorId: 'my-connector',
        chatModelOptions: {},
      });
      expect(createChatModelMock).toHaveBeenCalledTimes(1);
      return createChatModelMock.mock.calls[0][0];
    };

    it('does not leave an unhandled rejection when the model is never used', async () => {
      await getChatModelOptions();

      await new Promise((resolve) => setImmediate(resolve));
    });

    it('still rejects with the settings error when the anonymization rules are awaited', async () => {
      const { anonymizationRulesPromise } = await getChatModelOptions();

      await expect(anonymizationRulesPromise).rejects.toBe(settingsError);
    });
  });
});
