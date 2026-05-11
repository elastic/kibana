/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { TaskManagerClaimNudgeService } from './claim_nudge_service';
import { TASK_MANAGER_CLAIM_NUDGE_SO_NAME } from '../saved_objects';

describe('TaskManagerClaimNudgeService', () => {
  it('writes the claim nudge using refresh:true', async () => {
    const repository = savedObjectsRepositoryMock.create();
    const esClient = {
      fleet: {
        globalCheckpoints: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    const service = new TaskManagerClaimNudgeService({
      logger: loggingSystemMock.create().get(),
      esClient,
      savedObjectsRepository: repository,
      index: '.kibana_task_manager_claim_nudge',
    });

    await service.notify();

    expect(repository.create).toHaveBeenCalledWith(
      TASK_MANAGER_CLAIM_NUDGE_SO_NAME,
      expect.objectContaining({
        updated_at: expect.any(String),
        nonce: expect.any(String),
      }),
      {
        id: 'global',
        overwrite: true,
        refresh: true,
      }
    );
  });

  it('emits a claim nudge when checkpoints advance', async () => {
    const repository = savedObjectsRepositoryMock.create();
    const esClient = {
      fleet: {
        globalCheckpoints: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    const service = new TaskManagerClaimNudgeService({
      logger: loggingSystemMock.create().get(),
      esClient,
      savedObjectsRepository: repository,
      index: '.kibana_task_manager_claim_nudge',
    });

    let calls = 0;
    (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return { global_checkpoints: [1], timed_out: false };
      }

      service.stop();
      return { global_checkpoints: [2], timed_out: false };
    });

    const nudgeSpy = jest.fn();
    service.claimNudge$.subscribe(nudgeSpy);

    service.start();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(nudgeSpy).toHaveBeenCalledTimes(1);
  });
});
