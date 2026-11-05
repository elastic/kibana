/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { repositoryResourceProvider, slmPolicyResourceProvider } from './resource_provider';
import { createContext } from './test_helpers';

describe('Snapshot repository provider', () => {
  it('uses the snapshots of a repository as evidence of use', async () => {
    const { esClient, context } = createContext();
    esClient.snapshot.getRepository.mockResolvedValue({
      backups: { type: 'fs', settings: {} },
      empty: { type: 'fs', settings: {} },
      unreachable: { type: 's3', settings: {} },
      'found-snapshots': { type: 's3', settings: {} },
    } as unknown as Awaited<ReturnType<typeof esClient.snapshot.getRepository>>);
    esClient.snapshot.get.mockImplementation((async ({ repository }: { repository: string }) => {
      if (repository === 'unreachable') {
        throw new Error('repository_verification_exception');
      }
      return { snapshots: [], total: repository === 'empty' ? 0 : 3, remaining: 0 };
    }) as unknown as typeof esClient.snapshot.get);

    expect(await repositoryResourceProvider.listResources(context)).toEqual([
      { type: 'snapshot_repository', id: 'backups', isManaged: false, inUse: true },
      { type: 'snapshot_repository', id: 'empty', isManaged: false, inUse: false },
      { type: 'snapshot_repository', id: 'unreachable', isManaged: false, inUse: true },
      { type: 'snapshot_repository', id: 'found-snapshots', isManaged: true, inUse: true },
    ]);
  });

  it('is not available in serverless', () => {
    expect(repositoryResourceProvider.isAvailable?.(createContext(true).context)).toBe(false);
  });
});

describe('Snapshot policy provider', () => {
  it('points every policy at its repository', async () => {
    const { esClient, context } = createContext();
    esClient.slm.getLifecycle.mockResolvedValue({
      nightly: {
        policy: { name: '<nightly-{now/d}>', schedule: '0 30 1 * * ?', repository: 'backups' },
      },
    } as unknown as Awaited<ReturnType<typeof esClient.slm.getLifecycle>>);

    expect(await slmPolicyResourceProvider.listResources(context)).toEqual([
      {
        type: 'slm_policy',
        id: 'nightly',
        isManaged: false,
        references: [
          expect.objectContaining({
            targetType: 'snapshot_repository',
            targetId: 'backups',
            via: 'repository',
          }),
        ],
      },
    ]);
  });
});
