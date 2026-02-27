/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { AnonymizationPlugin } from './plugin';
import { ProfilesRepository } from './repository';
import type { AnonymizationProfile, AnonymizationEntityClass } from '@kbn/anonymization-common';

jest.mock('./system_index', () => ({
  ensureProfilesIndex: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./initialization', () => ({
  ALERTS_DATA_VIEW_TARGET_TYPE: 'data_view',
  getAlertsDataViewTargetId: (namespace: string) => `security-solution-alert-${namespace}`,
  ensureAlertsDataViewProfile: jest.fn().mockResolvedValue(undefined),
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE: 'index',
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID: '__kbn_global_anonymization_profile__',
  LEGACY_ANONYMIZATION_UI_SETTING_KEY: 'ai:anonymizationSettings',
  ensureGlobalAnonymizationProfile: jest.fn().mockResolvedValue(undefined),
  migrateLegacyUiSettingsIntoGlobalProfile: jest.fn().mockResolvedValue(undefined),
  ensureGlobalProfileForNamespace: jest.fn().mockResolvedValue(undefined),
}));
const initializationMock = jest.requireMock('./initialization') as {
  ensureGlobalProfileForNamespace: jest.Mock;
  ensureAlertsDataViewProfile: jest.Mock;
};

const createPlugin = (active = true) => {
  const initializerContext = coreMock.createPluginInitializerContext();
  (initializerContext.config.get as jest.Mock).mockReturnValue({ active });
  return new AnonymizationPlugin(initializerContext);
};

const createProfile = ({
  targetType,
  targetId,
  fieldRules,
}: {
  targetType: 'data_view' | 'index_pattern' | 'index';
  targetId: string;
  fieldRules: Array<{
    field: string;
    allowed: boolean;
    anonymized: boolean;
    entityClass?: AnonymizationEntityClass;
  }>;
}): AnonymizationProfile => ({
  id: `${targetType}-${targetId}`,
  name: `${targetType}-${targetId}`,
  targetType,
  targetId,
  rules: {
    fieldRules,
    regexRules: [],
    nerRules: [],
  },
  saltId: 'salt-default',
  namespace: 'default',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test',
  updatedBy: 'test',
});

describe('AnonymizationPlugin policy resolution', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('merges data view and referenced index-pattern policies with most-restrictive precedence', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    const resolve = jest.fn().mockResolvedValue({
      saved_object: {
        attributes: {
          title: 'logs-*, metrics-*',
        },
      },
    });
    const get = jest.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = jest.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue({
      asScopedToNamespace,
    });

    const findByTarget = jest
      .spyOn(ProfilesRepository.prototype, 'findByTarget')
      .mockImplementation(async (_namespace, targetType, targetId) => {
        if (targetType === 'data_view' && targetId === 'my-data-view') {
          return createProfile({
            targetType: 'data_view',
            targetId,
            fieldRules: [{ field: 'user.email', allowed: true, anonymized: false }],
          });
        }
        if (targetType === 'index_pattern' && targetId === 'logs-*') {
          return createProfile({
            targetType: 'index_pattern',
            targetId,
            fieldRules: [
              {
                field: 'user.email',
                allowed: true,
                anonymized: true,
                entityClass: 'EMAIL',
              },
              {
                field: 'host.name',
                allowed: true,
                anonymized: true,
                entityClass: 'HOST_NAME',
              },
            ],
          });
        }
        if (targetType === 'index_pattern' && targetId === 'metrics-*') {
          return createProfile({
            targetType: 'index_pattern',
            targetId,
            fieldRules: [{ field: 'user.email', allowed: false, anonymized: false }],
          });
        }

        return null;
      });

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    const policyService = start.getPolicyService();

    const effectivePolicy = await policyService.resolveEffectivePolicy('default', {
      type: 'data_view',
      id: 'my-data-view',
    });

    expect(findByTarget).toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledWith('index-pattern', 'my-data-view');
    expect(effectivePolicy['user.email']).toEqual({ action: 'deny' });
    expect(effectivePolicy['host.name']).toEqual({ action: 'anonymize', entityClass: 'HOST_NAME' });
  });

  it('falls back to data-view profile rules when data view resolution fails', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'index-pattern',
      'my-data-view'
    );
    const resolve = jest.fn().mockRejectedValue(notFoundError);
    const get = jest.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = jest.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue({
      asScopedToNamespace,
    });

    jest
      .spyOn(ProfilesRepository.prototype, 'findByTarget')
      .mockImplementation(async (_namespace, targetType, targetId) => {
        if (targetType === 'data_view' && targetId === 'my-data-view') {
          return createProfile({
            targetType: 'data_view',
            targetId,
            fieldRules: [{ field: 'user.email', allowed: true, anonymized: false }],
          });
        }
        return null;
      });

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    const policyService = start.getPolicyService();

    const effectivePolicy = await policyService.resolveEffectivePolicy('default', {
      type: 'data_view',
      id: 'my-data-view',
    });

    expect(effectivePolicy['user.email']).toEqual({ action: 'allow' });
  });

  it('registers routes and encrypted salt type on setup', () => {
    const plugin = createPlugin();
    const setup = coreMock.createSetup();
    const features = featuresPluginMock.createSetup();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup();

    plugin.setup(setup, {
      encryptedSavedObjects,
      features,
    });

    expect(setup.http.createRouter).toHaveBeenCalled();
    expect(setup.savedObjects.registerType).toHaveBeenCalled();
    expect(encryptedSavedObjects.registerType).toHaveBeenCalled();
  });

  it('does not bootstrap global profile on start and lazily ensures/migrates it on first policy resolution', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    const resolve = jest.fn().mockResolvedValue({
      saved_object: { attributes: { title: 'logs-*' } },
    });
    const get = jest.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = jest.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue({
      asScopedToNamespace,
    });
    jest.spyOn(ProfilesRepository.prototype, 'findByTarget').mockResolvedValue(null);

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });

    expect(initializationMock.ensureGlobalProfileForNamespace).not.toHaveBeenCalled();

    await start.getPolicyService().resolveEffectivePolicy('default', {
      type: 'data_view',
      id: 'my-data-view',
    });

    expect(initializationMock.ensureGlobalProfileForNamespace).toHaveBeenCalled();
  });

  it('returns no policy and skips initialization when plugin is disabled', async () => {
    const plugin = createPlugin(false);
    const coreStart = coreMock.createStart();
    const resolve = jest.fn().mockResolvedValue({
      saved_object: { attributes: { title: 'logs-*' } },
    });
    const get = jest.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = jest.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue({
      asScopedToNamespace,
    });

    const findByTarget = jest
      .spyOn(ProfilesRepository.prototype, 'findByTarget')
      .mockResolvedValue(null);

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    const policyService = start.getPolicyService();

    const effectivePolicy = await policyService.resolveEffectivePolicy('default', {
      type: 'data_view',
      id: 'my-data-view',
    });

    expect(start.isEnabled()).toBe(false);
    expect(effectivePolicy).toEqual({});
    expect(findByTarget).not.toHaveBeenCalled();
    expect(initializationMock.ensureGlobalProfileForNamespace).not.toHaveBeenCalled();
  });
});
