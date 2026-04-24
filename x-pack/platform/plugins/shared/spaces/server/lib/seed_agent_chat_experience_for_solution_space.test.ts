/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { CoreStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { seedAgentChatExperienceForSolutionSpace } from './seed_agent_chat_experience_for_solution_space';

describe('seedAgentChatExperienceForSolutionSpace', () => {
  const packageInfo = { version: '8.0.0-SNAPSHOT', buildNum: 42 };

  const createMocks = () => {
    const internalRepo = {
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    };
    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue(internalRepo),
      },
    } as unknown as CoreStart;

    return { coreStart, internalRepo };
  };

  it('persists Agent when solution view is Classic', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 'classic-space',
      solution: 'classic',
      packageInfo,
    });

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith(['config']);
    expect(internalRepo.update).toHaveBeenCalledWith(
      'config',
      '8.0.0',
      { 'aiAssistant:preferredChatExperience': AIChatExperience.Agent },
      { refresh: false, namespace: 'classic-space' }
    );
  });

  it('does not seed when solution is undefined', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 's1',
      solution: undefined,
      packageInfo,
    });

    expect(internalRepo.update).not.toHaveBeenCalled();
  });

  it('does not seed when solution is es', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 'es-space',
      solution: 'es',
      packageInfo,
    });

    expect(internalRepo.update).not.toHaveBeenCalled();
  });

  it('uses undefined namespace for the default space (oblt)', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 'default',
      solution: 'oblt',
      packageInfo,
    });

    expect(internalRepo.update).toHaveBeenCalledWith(
      'config',
      '8.0.0',
      { 'aiAssistant:preferredChatExperience': AIChatExperience.Agent },
      { refresh: false, namespace: undefined }
    );
  });

  it('updates config when it exists', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 'obs-space',
      solution: 'oblt',
      packageInfo,
    });

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith(['config']);
    expect(internalRepo.update).toHaveBeenCalledWith(
      'config',
      '8.0.0',
      { 'aiAssistant:preferredChatExperience': AIChatExperience.Agent },
      { refresh: false, namespace: 'obs-space' }
    );
    expect(internalRepo.create).not.toHaveBeenCalled();
  });

  it('creates config when update returns not found', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();
    internalRepo.update.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('config', '8.0.0')
    );

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 'sec-space',
      solution: 'security',
      packageInfo,
    });

    expect(internalRepo.create).toHaveBeenCalledWith(
      'config',
      {
        buildNum: 42,
        'aiAssistant:preferredChatExperience': AIChatExperience.Agent,
      },
      { id: '8.0.0', refresh: false, namespace: 'sec-space' }
    );
  });

  it('updates after create when another writer created config first (409 conflict)', async () => {
    const log = loggingSystemMock.create().get('test');
    const { coreStart, internalRepo } = createMocks();
    internalRepo.update
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('config', '8.0.0'))
      .mockResolvedValueOnce({});
    internalRepo.create.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError('config', '8.0.0')
    );

    await seedAgentChatExperienceForSolutionSpace({
      coreStart,
      log,
      spaceId: 'race-space',
      solution: 'security',
      packageInfo,
    });

    expect(internalRepo.update).toHaveBeenCalledTimes(2);
    expect(internalRepo.update).toHaveBeenLastCalledWith(
      'config',
      '8.0.0',
      { 'aiAssistant:preferredChatExperience': AIChatExperience.Agent },
      { refresh: false, namespace: 'race-space' }
    );
  });

  it('logs a warning and does not throw when update fails', async () => {
    const logging = loggingSystemMock.create();
    const log = logging.get('test');
    const warnSpy = jest.spyOn(log, 'warn');
    const { coreStart, internalRepo } = createMocks();
    internalRepo.update.mockRejectedValueOnce(new Error('unexpected'));

    await expect(
      seedAgentChatExperienceForSolutionSpace({
        coreStart,
        log,
        spaceId: 'oblt-space',
        solution: 'oblt',
        packageInfo,
      })
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
  });
});
