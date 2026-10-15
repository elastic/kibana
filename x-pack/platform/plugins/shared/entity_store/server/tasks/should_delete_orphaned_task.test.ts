/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { CoreStart } from '@kbn/core/server';
import { shouldDeleteOrphanedEntityStoreTask } from './should_delete_orphaned_task';
import { EngineDescriptorTypeName } from '../domain/saved_objects';

describe('shouldDeleteOrphanedEntityStoreTask', () => {
  const logger = loggerMock.create();
  const find = jest.fn();
  const createInternalRepository = jest.fn(() => ({ find }));
  const coreStart = {
    savedObjects: { createInternalRepository },
  } as unknown as CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    createInternalRepository.mockReturnValue({ find });
  });

  it('returns false when namespace is missing', async () => {
    await expect(
      shouldDeleteOrphanedEntityStoreTask({
        coreStart,
        namespace: undefined,
        logger,
      })
    ).resolves.toBe(false);
    expect(createInternalRepository).not.toHaveBeenCalled();
  });

  it('returns true when no engine descriptors exist for the namespace', async () => {
    find.mockResolvedValue({ saved_objects: [], total: 0 });

    await expect(
      shouldDeleteOrphanedEntityStoreTask({
        coreStart,
        namespace: 'gone-space',
        logger,
      })
    ).resolves.toBe(true);

    expect(createInternalRepository).toHaveBeenCalledWith([EngineDescriptorTypeName]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EngineDescriptorTypeName,
        namespaces: ['gone-space'],
      })
    );
  });

  it('returns false when at least one engine descriptor exists', async () => {
    find.mockResolvedValue({
      saved_objects: [{ attributes: { type: 'user', status: 'started' } }],
      total: 1,
    });

    await expect(
      shouldDeleteOrphanedEntityStoreTask({
        coreStart,
        namespace: 'default',
        logger,
      })
    ).resolves.toBe(false);
  });

  it('returns false on unexpected errors so the task is not deleted', async () => {
    find.mockRejectedValue(new Error('SO cluster unavailable'));

    await expect(
      shouldDeleteOrphanedEntityStoreTask({
        coreStart,
        namespace: 'default',
        logger,
      })
    ).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });
});
