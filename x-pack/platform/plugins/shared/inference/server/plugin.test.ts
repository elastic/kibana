/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { coreMock, elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { GEN_AI_SETTINGS_INFERENCE_STREAMING } from '@kbn/management-settings-ids';
import {
  createInferenceStreamingResolver,
  resolveOnFailureMode,
  resolveReplacementsEncryptionKey,
} from './plugin';

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

describe('resolveOnFailureMode', () => {
  it('returns the mode saved in the ai:anonymizationSettings setting', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.resolve({ rules: [], onFailure: 'allow_unsafe' }),
      })
    ).resolves.toBe('allow_unsafe');
  });

  it('blocks when the setting does not say otherwise', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.resolve({ rules: [] }),
      })
    ).resolves.toBe('block');
  });

  it('blocks on the profile-based path, which has no failure-mode concept', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: true,
        legacySettingsPromise: Promise.resolve({ rules: [], onFailure: 'allow_unsafe' }),
      })
    ).resolves.toBe('block');
  });

  it('blocks instead of rejecting when the setting cannot be read, so an unawaited promise is never an unhandled rejection', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.reject(new Error('saved objects unavailable')),
      })
    ).resolves.toBe('block');
  });
});

describe('createInferenceStreamingResolver', () => {
  const servicesCall = { method: 'GET', path: '/_inference/_services' };

  const setup = ({ streamingSetting }: { streamingSetting: boolean | undefined }) => {
    const coreStart = coreMock.createStart();
    const request = httpServerMock.createKibanaRequest();
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const internalEsClient = clusterClient.asInternalUser;
    const currentUserEsClient = clusterClient.asScoped().asCurrentUser;
    const core = {
      elasticsearch: { ...coreStart.elasticsearch, client: clusterClient },
      savedObjects: coreStart.savedObjects,
      uiSettings: coreStart.uiSettings,
    };
    const uiSettingsClient = core.uiSettings.asScopedToClient(
      core.savedObjects.getScopedClient(request)
    );
    jest.mocked(uiSettingsClient.get).mockResolvedValue(streamingSetting);

    // the caller cannot list inference services; only the internal user can
    currentUserEsClient.transport.request.mockRejectedValue(
      new errors.ResponseError({ statusCode: 403, body: {}, warnings: null, meta: {} as never })
    );
    internalEsClient.transport.request.mockResolvedValue([
      { service: 'openai', features: { non_streaming_chat: { supported: true } } },
    ]);

    const resolver = createInferenceStreamingResolver({
      core,
      logger: loggerMock.create(),
      request,
    });
    return { resolver, request, core, internalEsClient, currentUserEsClient, uiSettingsClient };
  };

  it('selects non-streaming through the internal user even when the caller cannot read services', async () => {
    const { resolver, request, core, internalEsClient, currentUserEsClient, uiSettingsClient } =
      setup({ streamingSetting: false });

    await expect(resolver('openai')).resolves.toBe(false);

    expect(core.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
    expect(uiSettingsClient.get).toHaveBeenCalledWith(GEN_AI_SETTINGS_INFERENCE_STREAMING);
    expect(internalEsClient.transport.request).toHaveBeenCalledWith(servicesCall);
    expect(currentUserEsClient.transport.request).not.toHaveBeenCalled();
  });

  it('streams without reading services when the setting is not explicitly off', async () => {
    for (const streamingSetting of [true, undefined]) {
      const { resolver, internalEsClient, currentUserEsClient } = setup({ streamingSetting });

      await expect(resolver('openai')).resolves.toBe(true);

      expect(internalEsClient.transport.request).not.toHaveBeenCalled();
      expect(currentUserEsClient.transport.request).not.toHaveBeenCalled();
    }
  });
});
