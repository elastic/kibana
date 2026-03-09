/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ensureAlertsDataViewProfile,
  getAlertsDataViewTargetId,
  ALERTS_DATA_VIEW_TARGET_TYPE,
} from './alerts_profile_initializer';
import type { ProfilesRepository } from '../repository';
import type { SaltService } from '../salt';

describe('ensureAlertsDataViewProfile', () => {
  const logger = loggingSystemMock.createLogger();

  const mockProfilesRepo = {
    findByTarget: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<ProfilesRepository>;

  const mockSaltService = {
    getSalt: jest.fn().mockResolvedValue('test-salt'),
  } as unknown as jest.Mocked<SaltService>;

  const checkDataViewExists = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
    checkDataViewExists.mockResolvedValue(true);
  });

  it('creates a profile when none exists', async () => {
    (mockProfilesRepo.findByTarget as jest.Mock).mockResolvedValue(null);
    (mockProfilesRepo.create as jest.Mock).mockResolvedValue({ id: 'test-id' });

    await ensureAlertsDataViewProfile({
      namespace: 'default',
      profilesRepo: mockProfilesRepo,
      saltService: mockSaltService,
      logger,
      checkDataViewExists,
    });

    expect(mockProfilesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Security Alerts Anonymization Profile',
        targetType: ALERTS_DATA_VIEW_TARGET_TYPE,
        targetId: getAlertsDataViewTargetId('default'),
        namespace: 'default',
        createdBy: 'system',
      })
    );
  });

  it('uses namespace-specific alerts data view target IDs', async () => {
    (mockProfilesRepo.findByTarget as jest.Mock).mockResolvedValue(null);
    (mockProfilesRepo.create as jest.Mock).mockResolvedValue({ id: 'test-id-security' });

    await ensureAlertsDataViewProfile({
      namespace: 'security',
      profilesRepo: mockProfilesRepo,
      saltService: mockSaltService,
      logger,
      checkDataViewExists,
    });

    expect(mockProfilesRepo.findByTarget).toHaveBeenCalledWith(
      'security',
      ALERTS_DATA_VIEW_TARGET_TYPE,
      getAlertsDataViewTargetId('security')
    );
    expect(mockProfilesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'security',
        targetId: 'security-solution-alert-security',
      })
    );
  });

  it('does not create a profile when one already exists', async () => {
    (mockProfilesRepo.findByTarget as jest.Mock).mockResolvedValue({ id: 'existing' });

    await ensureAlertsDataViewProfile({
      namespace: 'default',
      profilesRepo: mockProfilesRepo,
      saltService: mockSaltService,
      logger,
      checkDataViewExists,
    });

    expect(mockProfilesRepo.create).not.toHaveBeenCalled();
  });

  it('does not create a profile when the alerts data view does not exist', async () => {
    checkDataViewExists.mockResolvedValue(false);

    await ensureAlertsDataViewProfile({
      namespace: 'default',
      profilesRepo: mockProfilesRepo,
      saltService: mockSaltService,
      logger,
      checkDataViewExists,
    });

    expect(mockProfilesRepo.findByTarget).not.toHaveBeenCalled();
    expect(mockProfilesRepo.create).not.toHaveBeenCalled();
  });

  it('handles concurrent creation gracefully (409 conflict)', async () => {
    (mockProfilesRepo.findByTarget as jest.Mock).mockResolvedValue(null);
    const conflictErr = new Error('conflict');
    (conflictErr as any).statusCode = 409;
    (mockProfilesRepo.create as jest.Mock).mockRejectedValue(conflictErr);

    await expect(
      ensureAlertsDataViewProfile({
        namespace: 'default',
        profilesRepo: mockProfilesRepo,
        saltService: mockSaltService,
        logger,
        checkDataViewExists,
      })
    ).resolves.toBeUndefined();
  });

  it('rethrows non-409 errors', async () => {
    (mockProfilesRepo.findByTarget as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(
      ensureAlertsDataViewProfile({
        namespace: 'default',
        profilesRepo: mockProfilesRepo,
        saltService: mockSaltService,
        logger,
        checkDataViewExists,
      })
    ).rejects.toThrow('boom');
  });
});
