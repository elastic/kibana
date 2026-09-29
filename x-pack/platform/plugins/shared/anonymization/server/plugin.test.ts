/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { AnonymizationPlugin } from './plugin';
import { ProfilesRepository } from './repository';
import type { AnonymizationProfile, AnonymizationEntityClass } from '@kbn/anonymization-common';
import type { AnonymizationProfileInitializer } from './types';

// Allow tests to control ANONYMIZATION_FEATURE_ACTIVE per test via createPlugin(active)
// without exposing any production config option.
const featureState = vi.hoisted(() => ({ active: true }));
vi.mock('@kbn/anonymization-common', async () => ({
  ...(await vi.importActual('@kbn/anonymization-common')),
  get ANONYMIZATION_FEATURE_ACTIVE() {
    return featureState.active;
  },
}));

vi.mock('./system_index', () => {
  const mocked = {
    ensureProfilesIndex: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./initialization', () => {
  const mocked = {
    GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE: 'index',
    GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID: '__kbn_global_anonymization_profile__',
    LEGACY_ANONYMIZATION_UI_SETTING_KEY: 'ai:anonymizationSettings',
    ensureGlobalAnonymizationProfile: vi.fn().mockResolvedValue(undefined),
    migrateLegacyUiSettingsIntoGlobalProfile: vi.fn().mockResolvedValue(undefined),
    ensureGlobalProfileForNamespace: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});
const initializationMock = vi.mocked(await import('./initialization')) as {
  ensureGlobalProfileForNamespace: Mock;
};

const createPlugin = (active = true) => {
  featureState.active = active;
  const initializerContext = coreMock.createPluginInitializerContext();
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
    featureState.active = true;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('merges data view and referenced index-pattern policies with most-restrictive precedence', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    const resolve = vi.fn().mockResolvedValue({
      saved_object: {
        attributes: {
          title: 'logs-*, metrics-*',
        },
      },
    });
    const get = vi.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = vi.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = vi.fn().mockReturnValue({
      asScopedToNamespace,
    });

    const findByTarget = vi
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
    const resolve = vi.fn().mockRejectedValue(notFoundError);
    const get = vi.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = vi.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = vi.fn().mockReturnValue({
      asScopedToNamespace,
    });

    vi.spyOn(ProfilesRepository.prototype, 'findByTarget').mockImplementation(
      async (_namespace, targetType, targetId) => {
        if (targetType === 'data_view' && targetId === 'my-data-view') {
          return createProfile({
            targetType: 'data_view',
            targetId,
            fieldRules: [{ field: 'user.email', allowed: true, anonymized: false }],
          });
        }
        return null;
      }
    );

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

    const resolve = vi.fn().mockResolvedValue({
      saved_object: { attributes: { title: 'logs-*' } },
    });
    const get = vi.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = vi.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = vi.fn().mockReturnValue({
      asScopedToNamespace,
    });
    vi.spyOn(ProfilesRepository.prototype, 'findByTarget').mockResolvedValue(null);

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
    const resolve = vi.fn().mockResolvedValue({
      saved_object: { attributes: { title: 'logs-*' } },
    });
    const get = vi.fn().mockResolvedValue({ id: 'security-solution-alert-default' });
    const asScopedToNamespace = vi.fn().mockReturnValue({
      resolve,
      get,
    });
    coreStart.savedObjects.getUnsafeInternalClient = vi.fn().mockReturnValue({
      asScopedToNamespace,
    });

    const findByTarget = vi
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

  it('dispatches registered profile initializers before policy resolution', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    const shouldInitialize = vi.fn().mockReturnValue(true);
    const initialize = vi.fn().mockResolvedValue(undefined);
    const initializer: AnonymizationProfileInitializer = {
      id: 'test.initializer',
      shouldInitialize,
      initialize,
    };

    vi.spyOn(ProfilesRepository.prototype, 'findByTarget').mockResolvedValue(null);

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    start.registerProfileInitializer(initializer);

    await start.getPolicyService().resolveEffectivePolicy('default', {
      type: 'index',
      id: 'logs-*',
    });

    expect(shouldInitialize).toHaveBeenCalledWith({
      namespace: 'default',
      target: { type: 'index', id: 'logs-*' },
    });
    expect(initialize).toHaveBeenCalled();
  });

  it('dispatches matching profile initializers in registration order', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    const callOrder: string[] = [];

    const firstInitializer: AnonymizationProfileInitializer = {
      id: 'test.initializer.first',
      shouldInitialize: vi.fn().mockReturnValue(true),
      initialize: vi.fn().mockImplementation(async () => {
        callOrder.push('first');
      }),
    };
    const secondInitializer: AnonymizationProfileInitializer = {
      id: 'test.initializer.second',
      shouldInitialize: vi.fn().mockReturnValue(true),
      initialize: vi.fn().mockImplementation(async () => {
        callOrder.push('second');
      }),
    };

    vi.spyOn(ProfilesRepository.prototype, 'findByTarget').mockResolvedValue(null);

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    start.registerProfileInitializer(firstInitializer);
    start.registerProfileInitializer(secondInitializer);

    await start.getPolicyService().resolveEffectivePolicy('default', {
      type: 'index',
      id: 'logs-*',
    });

    expect(callOrder).toEqual(['first', 'second']);
  });

  it('stops dispatching additional initializers when one throws', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    const firstError = new Error('initializer failure');

    const firstInitializer: AnonymizationProfileInitializer = {
      id: 'test.initializer.throwing',
      shouldInitialize: vi.fn().mockReturnValue(true),
      initialize: vi.fn().mockRejectedValue(firstError),
    };
    const secondInitializer: AnonymizationProfileInitializer = {
      id: 'test.initializer.not_called',
      shouldInitialize: vi.fn().mockReturnValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(ProfilesRepository.prototype, 'findByTarget').mockResolvedValue(null);

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    start.registerProfileInitializer(firstInitializer);
    start.registerProfileInitializer(secondInitializer);

    await expect(
      start.getPolicyService().resolveEffectivePolicy('default', {
        type: 'index',
        id: 'logs-*',
      })
    ).rejects.toThrow('initializer failure');
    expect(secondInitializer.initialize).not.toHaveBeenCalled();
  });

  it('overwrites existing initializer for duplicate id in start contract', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    const firstInitialize = vi.fn().mockResolvedValue(undefined);
    const secondInitialize = vi.fn().mockResolvedValue(undefined);

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });

    start.registerProfileInitializer({
      id: 'test.initializer.duplicate',
      shouldInitialize: vi.fn().mockReturnValue(true),
      initialize: firstInitialize,
    });
    start.registerProfileInitializer({
      id: 'test.initializer.duplicate',
      shouldInitialize: vi.fn().mockReturnValue(true),
      initialize: secondInitialize,
    });

    vi.spyOn(ProfilesRepository.prototype, 'findByTarget').mockResolvedValue(null);

    await start.getPolicyService().resolveEffectivePolicy('default', {
      type: 'index',
      id: 'logs-*',
    });

    expect(firstInitialize).not.toHaveBeenCalled();
    expect(secondInitialize).toHaveBeenCalled();
  });

  it('logs a warning when duplicate initializer id is registered', () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    const logger = (plugin as unknown as { logger: { warn: Mock } }).logger;
    const warnSpy = vi.spyOn(logger, 'warn');

    const start = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });

    start.registerProfileInitializer({
      id: 'test.initializer.duplicate_warn',
      shouldInitialize: vi.fn().mockReturnValue(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    });
    start.registerProfileInitializer({
      id: 'test.initializer.duplicate_warn',
      shouldInitialize: vi.fn().mockReturnValue(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Overwriting existing anonymization profile initializer: test.initializer.duplicate_warn'
    );
  });
});
