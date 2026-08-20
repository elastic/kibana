/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import type { InstallablePackage } from '../../../../../common/types';
import { appContextService } from '../../../app_context';

import { enforceInstallDatasetOwnership } from './enforce_install_ownership';
import { DatasetOwnershipConflictError } from './errors';

jest.mock('../../../app_context');
jest.mock('./resolve_ownership');
jest.mock('./claims');
jest.mock('../namespace_template_utils', () => ({ isOtelDataStream: () => false }));

import { resolveDatasetOwnership } from './resolve_ownership';
import { acquireDatasetClaims, recordAdoptedStreamBaselines } from './claims';

const mockedResolve = resolveDatasetOwnership as jest.MockedFunction<
  typeof resolveDatasetOwnership
>;
const mockedAcquire = acquireDatasetClaims as jest.MockedFunction<typeof acquireDatasetClaims>;
const mockedRecord = recordAdoptedStreamBaselines as jest.MockedFunction<
  typeof recordAdoptedStreamBaselines
>;
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const withLock = jest.fn(async (_id: string, fn: () => Promise<unknown>) => fn());

const packageInfo = {
  name: 'mine',
  version: '1.0.0',
  data_streams: [{ type: 'logs', dataset: 'mine.data' }],
  policy_templates: [],
} as unknown as InstallablePackage;

const args = () => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  soClient: savedObjectsClientMock.create(),
  logger: loggingSystemMock.createLogger(),
  packageInfo,
  installSource: 'registry' as const,
  attemptId: 'attempt-1',
});

const clean = { allowlist: [], adoptedStreams: [], conflicts: [], warnings: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockedAcquire.mockResolvedValue({ acquired: [] });
  withLock.mockImplementation(async (_id, fn) => fn());
  mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);
});

describe('enforceInstallDatasetOwnership', () => {
  it('throws when the lock manager is unavailable', async () => {
    mockedAppContextService.getLockManagerService.mockReturnValue(undefined as never);
    mockedResolve.mockResolvedValue(clean);

    await expect(enforceInstallDatasetOwnership(args())).rejects.toThrow(
      /Dataset ownership lock is unavailable/
    );
    expect(mockedResolve).not.toHaveBeenCalled();
    expect(mockedAcquire).not.toHaveBeenCalled();
  });

  it('runs resolve and acquire under the dataset ownership lock', async () => {
    mockedResolve.mockResolvedValue(clean);

    await enforceInstallDatasetOwnership(args());

    expect(withLock).toHaveBeenCalledWith('fleet-dataset-ownership', expect.any(Function));
  });

  it('runs afterAcquire under the lock after claims are acquired', async () => {
    const order: string[] = [];
    mockedResolve.mockImplementation(async () => {
      order.push('resolve');
      return clean;
    });
    mockedAcquire.mockImplementation(async () => {
      order.push('acquire');
      return { acquired: [] };
    });
    withLock.mockImplementation(async (_id, fn) => {
      order.push('lock');
      const result = await fn();
      order.push('unlock');
      return result;
    });

    await enforceInstallDatasetOwnership({
      ...args(),
      afterAcquire: async () => {
        order.push('reserve');
      },
    });

    expect(order).toEqual(['lock', 'resolve', 'acquire', 'reserve', 'unlock']);
  });

  it('throws and acquires nothing when the package would take over a foreign stream', async () => {
    mockedResolve.mockResolvedValue({
      ...clean,
      conflicts: [
        {
          kind: 'data_stream',
          name: 'logs-payroll.records-teamb',
          reason: 'would_govern',
          owningPackage: 'theirs',
        },
      ],
    });

    await expect(enforceInstallDatasetOwnership(args())).rejects.toThrow(
      /logs-payroll\.records-teamb/
    );
    expect(mockedAcquire).not.toHaveBeenCalled();
  });

  it('raises a 409-mapped error type', async () => {
    mockedResolve.mockResolvedValue({
      ...clean,
      conflicts: [{ kind: 'index_template', name: 'teamb', reason: 'same_template_name' }],
    });

    await expect(enforceInstallDatasetOwnership(args())).rejects.toBeInstanceOf(
      DatasetOwnershipConflictError
    );
  });

  it('logs warnings without failing the install', async () => {
    mockedResolve.mockResolvedValue({
      ...clean,
      warnings: [
        {
          kind: 'data_stream',
          name: 'logs-mine.data-default',
          reason: 'would_govern',
          governingTemplate: 'teamb-clone',
          governingPriority: 400,
        },
      ],
    });
    const input = args();

    await enforceInstallDatasetOwnership(input);

    expect(input.logger.warn).toHaveBeenCalledWith(expect.stringContaining('teamb-clone'));
  });

  it.each(['upload', 'custom'] as const)(
    'rejects dataset_is_prefix for %s packages before resolving',
    async (installSource) => {
      mockedResolve.mockResolvedValue(clean);

      await expect(
        enforceInstallDatasetOwnership({
          ...args(),
          installSource,
          packageInfo: {
            ...packageInfo,
            data_streams: [{ type: 'logs', dataset: 'mine', dataset_is_prefix: true }],
          } as unknown as InstallablePackage,
        })
      ).rejects.toThrow(/Prefix dataset ownership is not permitted/);
      expect(mockedResolve).not.toHaveBeenCalled();
    }
  );

  it('allows dataset_is_prefix for registry packages', async () => {
    mockedResolve.mockResolvedValue(clean);

    await expect(
      enforceInstallDatasetOwnership({
        ...args(),
        packageInfo: {
          ...packageInfo,
          data_streams: [{ type: 'logs', dataset: 'mine', dataset_is_prefix: true }],
        } as unknown as InstallablePackage,
      })
    ).resolves.toBeDefined();
  });

  it('acquires claims stamped with the attempt and returns the allowlist', async () => {
    mockedResolve.mockResolvedValue({ ...clean, allowlist: ['logs-mine.data-default'] });
    mockedAcquire.mockResolvedValue({ acquired: ['logs-mine.data'] });

    await expect(enforceInstallDatasetOwnership(args())).resolves.toEqual({
      ownedDataStreams: ['logs-mine.data-default'],
      acquiredDatasetClaims: ['logs-mine.data'],
    });
    expect(mockedAcquire).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: 'attempt-1',
        origin: 'install',
        claims: [{ baseName: 'logs-mine.data', indexPatterns: ['logs-mine.data-*'] }],
      })
    );
  });

  it('also claims index templates already recorded on the package SO', async () => {
    mockedResolve.mockResolvedValue(clean);
    mockedAcquire.mockResolvedValue({ acquired: ['logs-mine.data', 'logs-custom'] });

    await enforceInstallDatasetOwnership({
      ...args(),
      installedEs: [{ id: 'logs-custom', type: 'index_template' }],
    });

    expect(mockedAcquire).toHaveBeenCalledWith(
      expect.objectContaining({
        claims: expect.arrayContaining([
          { baseName: 'logs-mine.data', indexPatterns: ['logs-mine.data-*'] },
          { baseName: 'logs-custom', indexPatterns: ['logs-custom-*'] },
        ]),
      })
    );
  });

  it('resolves before it acquires, so this attempt claim cannot vouch for itself', async () => {
    const order: string[] = [];
    mockedResolve.mockImplementation(async () => {
      order.push('resolve');
      return clean;
    });
    mockedAcquire.mockImplementation(async () => {
      order.push('acquire');
      return { acquired: [] };
    });

    await enforceInstallDatasetOwnership(args());

    expect(order).toEqual(['resolve', 'acquire']);
  });

  it('records baselines only for adopted streams', async () => {
    mockedResolve.mockResolvedValue({
      ...clean,
      allowlist: ['logs-mine.data-default', 'logs-mine.data-teamb'],
      adoptedStreams: [
        {
          baseName: 'logs-mine.data',
          name: 'logs-mine.data-teamb',
          previousDefaultPipeline: 'logs@default-pipeline',
        },
      ],
    });

    await enforceInstallDatasetOwnership(args());

    expect(mockedRecord).toHaveBeenCalledTimes(1);
    expect(mockedRecord).toHaveBeenCalledWith(expect.anything(), 'logs-mine.data', [
      { name: 'logs-mine.data-teamb', previous_default_pipeline: 'logs@default-pipeline' },
    ]);
  });

  it('records nothing when the package adopted nothing', async () => {
    mockedResolve.mockResolvedValue({ ...clean, allowlist: ['logs-mine.data-default'] });

    await enforceInstallDatasetOwnership(args());

    expect(mockedRecord).not.toHaveBeenCalled();
  });
});
