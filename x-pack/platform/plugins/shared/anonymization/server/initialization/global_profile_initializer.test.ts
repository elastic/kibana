/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ProfilesRepository } from '../repository';
import {
  ensureGlobalAnonymizationProfile,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
} from './global_profile_initializer';

describe('ensureGlobalAnonymizationProfile', () => {
  const logger = loggingSystemMock.createLogger();
  const mockProfilesRepo = {
    findByTarget: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ProfilesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the global profile when it does not exist', async () => {
    mockProfilesRepo.findByTarget.mockResolvedValue(null);

    await ensureGlobalAnonymizationProfile({
      namespace: 'default',
      profilesRepo: mockProfilesRepo,
      logger,
    });

    expect(mockProfilesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'default',
        targetType: GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
        targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
        rules: {
          fieldRules: [],
          regexRules: [],
          nerRules: [],
        },
      })
    );
  });

  it('normalizes existing global profile field rules to empty', async () => {
    mockProfilesRepo.findByTarget.mockResolvedValue({
      id: 'global-profile',
      name: 'global',
      targetType: GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
      targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
      rules: {
        fieldRules: [{ field: 'host.name', allowed: true, anonymized: false }],
        regexRules: [],
        nerRules: [],
      },
      saltId: 'salt-default',
      namespace: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    });

    await ensureGlobalAnonymizationProfile({
      namespace: 'default',
      profilesRepo: mockProfilesRepo,
      logger,
    });

    expect(mockProfilesRepo.create).not.toHaveBeenCalled();
    expect(mockProfilesRepo.update).toHaveBeenCalledWith(
      'default',
      'global-profile',
      expect.objectContaining({
        rules: {
          fieldRules: [],
          regexRules: [],
          nerRules: [],
        },
      })
    );
  });

  it('merges incoming regex/NER rules by id into existing global profile', async () => {
    mockProfilesRepo.findByTarget.mockResolvedValue({
      id: 'global-profile',
      name: 'global',
      targetType: GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
      targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
      rules: {
        fieldRules: [],
        regexRules: [
          {
            id: 'existing-regex',
            type: 'regex',
            pattern: 'foo',
            entityClass: 'HOST_NAME',
            enabled: true,
          },
        ],
        nerRules: [
          {
            id: 'existing-ner',
            type: 'ner',
            modelId: 'model-1',
            allowedEntityClasses: ['PER'],
            enabled: true,
          },
        ],
      },
      saltId: 'salt-default',
      namespace: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    });

    await ensureGlobalAnonymizationProfile({
      namespace: 'default',
      profilesRepo: mockProfilesRepo,
      logger,
      regexRules: [
        {
          id: 'existing-regex',
          type: 'regex',
          pattern: 'foo',
          entityClass: 'HOST_NAME',
          enabled: true,
        },
        {
          id: 'incoming-regex',
          type: 'regex',
          pattern: 'bar',
          entityClass: 'EMAIL',
          enabled: true,
        },
      ],
      nerRules: [
        {
          id: 'existing-ner',
          type: 'ner',
          modelId: 'model-1',
          allowedEntityClasses: ['PER'],
          enabled: true,
        },
        {
          id: 'incoming-ner',
          type: 'ner',
          modelId: 'model-2',
          allowedEntityClasses: ['ORG'],
          enabled: true,
        },
      ],
    });

    expect(mockProfilesRepo.create).not.toHaveBeenCalled();
    expect(mockProfilesRepo.update).toHaveBeenCalledWith(
      'default',
      'global-profile',
      expect.objectContaining({
        rules: {
          fieldRules: [],
          regexRules: [
            {
              id: 'existing-regex',
              type: 'regex',
              pattern: 'foo',
              entityClass: 'HOST_NAME',
              enabled: true,
            },
            {
              id: 'incoming-regex',
              type: 'regex',
              pattern: 'bar',
              entityClass: 'EMAIL',
              enabled: true,
            },
          ],
          nerRules: [
            {
              id: 'existing-ner',
              type: 'ner',
              modelId: 'model-1',
              allowedEntityClasses: ['PER'],
              enabled: true,
            },
            {
              id: 'incoming-ner',
              type: 'ner',
              modelId: 'model-2',
              allowedEntityClasses: ['ORG'],
              enabled: true,
            },
          ],
        },
      })
    );
  });
});
