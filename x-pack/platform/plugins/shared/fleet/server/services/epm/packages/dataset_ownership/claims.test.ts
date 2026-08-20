/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { appContextService } from '../../../app_context';

import {
  acquireDatasetClaims,
  finalizeDatasetClaims,
  releaseAttemptClaims,
  transferPendingClaims,
} from './claims';
import { DatasetClaimConflictError } from './errors';

jest.mock('../../../app_context');

const conflict = () => SavedObjectsErrorHelpers.createConflictError('t', 'logs-mine');

const base = {
  packageName: 'mine',
  packageVersion: '1.0.0',
  installSource: 'registry' as const,
  attemptId: 'attempt-1',
  claims: [{ baseName: 'logs-mine', indexPatterns: ['logs-mine-*'] }],
};

describe('acquireDatasetClaims', () => {
  it('creates a pending claim stamped with this attempt', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create.mockResolvedValue({ id: 'logs-mine' } as never);

    const result = await acquireDatasetClaims({ soClient, ...base });

    expect(result.acquired).toEqual(['logs-mine']);
    expect(soClient.create).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      expect.objectContaining({
        package_name: 'mine',
        status: 'pending',
        origin: 'install',
        attempt_id: 'attempt-1',
        index_patterns: ['logs-mine-*'],
      }),
      expect.objectContaining({ id: 'logs-mine', overwrite: false })
    );
  });

  it('never mutates a claim the same package already holds', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create.mockRejectedValue(conflict());
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'mine', status: 'active', index_patterns: ['logs-mine-*'] },
    } as never);

    const result = await acquireDatasetClaims({ soClient, ...base });

    expect(result.acquired).toEqual([]);
    expect(soClient.update).not.toHaveBeenCalled();
    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('does not steal a pending claim held by another live attempt of the same package', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create.mockRejectedValue(conflict());
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'mine',
        status: 'pending',
        attempt_id: 'other-attempt',
        index_patterns: ['logs-mine-*'],
      },
    } as never);

    const result = await acquireDatasetClaims({ soClient, ...base });

    expect(result.acquired).toEqual([]);
    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('throws when another package holds the claim', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create.mockRejectedValue(conflict());
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'theirs', status: 'active' },
    } as never);

    await expect(acquireDatasetClaims({ soClient, ...base })).rejects.toBeInstanceOf(
      DatasetClaimConflictError
    );
  });

  it('releases only what this call acquired when a later claim conflicts', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create
      .mockResolvedValueOnce({ id: 'logs-a' } as never)
      .mockRejectedValueOnce(conflict());
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'theirs', status: 'active' },
    } as never);

    await expect(
      acquireDatasetClaims({
        soClient,
        ...base,
        claims: [
          { baseName: 'logs-a', indexPatterns: ['logs-a-*'] },
          { baseName: 'logs-b', indexPatterns: ['logs-b-*'] },
        ],
      })
    ).rejects.toBeInstanceOf(DatasetClaimConflictError);

    expect(soClient.delete).toHaveBeenCalledTimes(1);
    expect(soClient.delete).toHaveBeenCalledWith('fleet-dataset-claims', 'logs-a');
  });

  it('retries the atomic create when the claim disappears after a conflict', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce({ id: 'logs-mine' } as never);
    soClient.get
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('t', 'logs-mine'))
      .mockResolvedValueOnce({
        attributes: { package_name: 'mine', status: 'pending', attempt_id: 'attempt-1' },
      } as never);

    const result = await acquireDatasetClaims({ soClient, ...base });

    expect(result.acquired).toEqual(['logs-mine']);
    expect(soClient.create).toHaveBeenCalledTimes(2);
  });

  it('fails closed when a create conflict is followed by a disappearing claim twice', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create.mockRejectedValue(conflict());
    soClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('t', 'logs-mine')
    );

    await expect(acquireDatasetClaims({ soClient, ...base })).rejects.toBeInstanceOf(
      DatasetClaimConflictError
    );
  });

  it('stores every declared index pattern', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.create.mockResolvedValue({ id: 'logs-foo' } as never);

    await acquireDatasetClaims({
      soClient,
      ...base,
      claims: [{ baseName: 'logs-foo', indexPatterns: ['logs-foo.*-*', 'logs-foo-*'] }],
    });

    expect(soClient.create).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      expect.objectContaining({ index_patterns: ['logs-foo.*-*', 'logs-foo-*'] }),
      expect.anything()
    );
  });

  it('rejects a claim whose index patterns overlap another package claim', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'logs-foo',
          attributes: {
            package_name: 'prefix-owner',
            index_patterns: ['logs-foo.*-*'],
          },
        },
      ],
    } as never);

    await expect(
      acquireDatasetClaims({
        soClient,
        ...base,
        packageName: 'exact-owner',
        claims: [{ baseName: 'logs-foo.bar', indexPatterns: ['logs-foo.bar-*'] }],
      })
    ).rejects.toBeInstanceOf(DatasetClaimConflictError);

    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('allows overlapping patterns that already belong to the same package', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'logs-foo',
          attributes: {
            package_name: 'mine',
            index_patterns: ['logs-foo.*-*'],
          },
        },
      ],
    } as never);
    soClient.create.mockResolvedValue({ id: 'logs-foo.bar' } as never);

    const result = await acquireDatasetClaims({
      soClient,
      ...base,
      claims: [{ baseName: 'logs-foo.bar', indexPatterns: ['logs-foo.bar-*'] }],
    });

    expect(result.acquired).toEqual(['logs-foo.bar']);
  });
});

describe('finalizeDatasetClaims', () => {
  it('activates a pending claim for this package', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'mine',
        status: 'pending',
        attempt_id: 'attempt-1',
        index_patterns: ['logs-mine-*'],
      },
    } as never);

    await finalizeDatasetClaims({ soClient, ...base });

    expect(soClient.update).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      'logs-mine',
      expect.objectContaining({ status: 'active', package_version: '1.0.0' })
    );
  });

  it('refreshes patterns when an upgrade changed them', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'mine',
        status: 'active',
        index_patterns: ['logs-mine-*'],
      },
    } as never);

    await finalizeDatasetClaims({
      soClient,
      ...base,
      claims: [{ baseName: 'logs-mine', indexPatterns: ['logs-mine.*-*'] }],
    });

    expect(soClient.update).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      'logs-mine',
      expect.objectContaining({ index_patterns: ['logs-mine.*-*'] })
    );
  });

  it('leaves an unchanged active claim alone', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'mine',
        status: 'active',
        package_version: '1.0.0',
        index_patterns: ['logs-mine-*'],
      },
    } as never);

    await finalizeDatasetClaims({ soClient, ...base });

    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('does not promote a pending claim from another attempt', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'mine',
        status: 'pending',
        attempt_id: 'other',
        index_patterns: ['logs-mine-*'],
      },
    } as never);

    await finalizeDatasetClaims({ soClient, ...base });

    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('never touches a claim owned by a different package', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'theirs', status: 'active', index_patterns: [] },
    } as never);

    await finalizeDatasetClaims({ soClient, ...base });

    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('does not finalize when the package reservation belongs to another attempt', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: { dataset_claim_attempt_id: 'other' },
    } as never);

    await finalizeDatasetClaims({ soClient, ...base, requireReservation: true });

    expect(soClient.update).not.toHaveBeenCalled();
  });
});

describe('releaseAttemptClaims', () => {
  const withLock = jest.fn(async (_id: string, fn: () => Promise<unknown>) => fn());
  const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

  beforeEach(() => {
    jest.clearAllMocks();
    withLock.mockImplementation(async (_id, fn) => fn());
    mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);
  });

  it('deletes only this attempt pending claims', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [{ id: 'logs-new', attributes: { status: 'pending' } }],
    } as never);
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'mine', status: 'pending', attempt_id: 'attempt-1' },
    } as never);

    await releaseAttemptClaims(soClient, 'mine', 'attempt-1');

    const filter = soClient.find.mock.calls[0][0].filter as string;
    expect(filter).toContain('status:"pending"');
    expect(filter).toContain('attempt_id:"attempt-1"');
    expect(withLock).toHaveBeenCalledWith('fleet-dataset-ownership', expect.any(Function));
    expect(soClient.delete).toHaveBeenCalledWith('fleet-dataset-claims', 'logs-new');
  });

  it('does not delete a claim POST promoted to an active adoption', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [{ id: 'logs-new', attributes: { status: 'pending' } }],
    } as never);
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'mine',
        status: 'active',
        origin: 'adoption',
        attempt_id: 'adoption-1',
      },
    } as never);

    await releaseAttemptClaims(soClient, 'mine', 'attempt-1');

    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('does not delete pending claims while the package is still reserved to this attempt', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue({
      attributes: { dataset_claim_attempt_id: 'attempt-1', install_status: 'installing' },
    } as never);

    await releaseAttemptClaims(soClient, 'mine', 'attempt-1');

    expect(soClient.find).not.toHaveBeenCalled();
    expect(soClient.delete).not.toHaveBeenCalled();
  });
});

describe('transferPendingClaims', () => {
  it('restamps pending claims from the previous attempt', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [{ id: 'logs-mine', attributes: { attempt_id: 'old' } }],
    } as never);
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'mine', status: 'pending', attempt_id: 'old' },
    } as never);

    await transferPendingClaims(soClient, 'mine', 'old', 'new');

    expect(soClient.update).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      'logs-mine',
      expect.objectContaining({ attempt_id: 'new' })
    );
  });
});
