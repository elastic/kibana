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
import type { AnonymizationProfile } from '@kbn/anonymization-common';

jest.mock('./system_index', () => ({
  ensureProfilesIndex: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./migration', () => ({
  migrateAnonymizationSettings: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./initialization', () => ({
  ALERTS_DATA_VIEW_TARGET_TYPE: 'data_view',
  getAlertsDataViewTargetId: (namespace: string) => `security-solution-${namespace}`,
  ensureAlertsDataViewProfile: jest.fn().mockResolvedValue(undefined),
}));

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
    entityClass?: string;
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
    const initializerContext = coreMock.createPluginInitializerContext();
    const plugin = new AnonymizationPlugin(initializerContext);
    const coreStart = coreMock.createStart();

    const resolve = jest.fn().mockResolvedValue({
      saved_object: {
        attributes: {
          title: 'logs-*, metrics-*',
        },
      },
    });
    const asScopedToNamespace = jest.fn().mockReturnValue({
      resolve,
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
    const initializerContext = coreMock.createPluginInitializerContext();
    const plugin = new AnonymizationPlugin(initializerContext);
    const coreStart = coreMock.createStart();

    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'index-pattern',
      'my-data-view'
    );
    const resolve = jest.fn().mockRejectedValue(notFoundError);
    const asScopedToNamespace = jest.fn().mockReturnValue({
      resolve,
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
    const initializerContext = coreMock.createPluginInitializerContext();
    const plugin = new AnonymizationPlugin(initializerContext);
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
});
