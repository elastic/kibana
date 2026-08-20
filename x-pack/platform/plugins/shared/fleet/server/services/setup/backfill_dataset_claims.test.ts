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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { backfillDatasetClaims, sweepOrphanedDatasetClaims } from './backfill_dataset_claims';
import { appContextService } from '../app_context';

jest.mock('../app_context');

const soClient = savedObjectsClientMock.create();
const esClient = elasticsearchServiceMock.createElasticsearchClient();
const logger = loggingSystemMock.createLogger();
const withLock = jest.fn(async (_id: string, fn: () => Promise<unknown>) => fn());
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

const installed = (packages: unknown[]) =>
  soClient.find.mockResolvedValue({
    saved_objects: packages.map((attributes) => ({ attributes })),
  } as never);

const templates = (byName: Record<string, { index_patterns: string[]; priority: number }>) =>
  esClient.indices.getIndexTemplate.mockImplementation((async ({ name }: { name?: string }) =>
    byName[name as string]
      ? { index_templates: [{ name, index_template: byName[name as string] }] }
      : Promise.reject({ meta: { statusCode: 404 } })) as never);

beforeEach(() => {
  jest.clearAllMocks();
  soClient.create.mockResolvedValue({ id: 'x' } as never);
  soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('t', 'x'));
  withLock.mockImplementation(async (_id, fn) => fn());
  mockedAppContextService.getLockManagerService.mockReturnValue({ withLock } as never);
});

describe('backfillDatasetClaims', () => {
  it('creates an active backfill claim using the real patterns from Elasticsearch', async () => {
    installed([
      {
        name: 'nginx',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-nginx.access', type: 'index_template' }],
      },
    ]);
    templates({ 'logs-nginx.access': { index_patterns: ['logs-nginx.access-*'], priority: 200 } });

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.created).toBe(1);
    expect(soClient.create).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      expect.objectContaining({
        origin: 'backfill',
        status: 'pending',
        index_patterns: ['logs-nginx.access-*'],
      }),
      expect.anything()
    );
  });

  it('stores every pattern a template declares', async () => {
    installed([
      {
        name: 'p',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-foo', type: 'index_template' }],
      },
    ]);
    templates({ 'logs-foo': { index_patterns: ['logs-foo.*-*', 'logs-foo-*'], priority: 150 } });

    await backfillDatasetClaims(soClient, esClient, logger);

    expect(soClient.create).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      expect.objectContaining({ index_patterns: ['logs-foo.*-*', 'logs-foo-*'] }),
      expect.anything()
    );
  });

  it('does not create a claim for an uploaded package', async () => {
    installed([
      {
        name: 'evil',
        version: '1',
        install_source: 'upload',
        installed_es: [{ id: 'logs-payroll.records', type: 'index_template' }],
      },
    ]);
    templates({
      'logs-payroll.records': { index_patterns: ['logs-payroll.records-*'], priority: 200 },
    });

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.created).toBe(0);
    expect(result.skipped).toEqual(['logs-payroll.records']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('logs-payroll.records'));
  });

  it('reports a conflict instead of picking a winner between two packages', async () => {
    installed([
      {
        name: 'a',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-x', type: 'index_template' }],
      },
      {
        name: 'b',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-x', type: 'index_template' }],
      },
    ]);
    templates({ 'logs-x': { index_patterns: ['logs-x-*'], priority: 200 } });

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.conflicts).toEqual(['logs-x']);
    expect(result.created).toBe(0);
  });

  it('reports a conflict for patterns that overlap across different owners', async () => {
    installed([
      {
        name: 'a',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-foo', type: 'index_template' }],
      },
      {
        name: 'b',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-foo.bar', type: 'index_template' }],
      },
    ]);
    templates({
      'logs-foo': { index_patterns: ['logs-foo.*-*'], priority: 150 },
      'logs-foo.bar': { index_patterns: ['logs-foo.bar-*'], priority: 200 },
    });

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.conflicts.sort()).toEqual(['logs-foo', 'logs-foo.bar']);
    expect(result.created).toBe(0);
  });

  it('does not treat one package overlapping itself as a conflict', async () => {
    installed([
      {
        name: 'a',
        version: '1',
        install_source: 'registry',
        installed_es: [
          { id: 'logs-foo', type: 'index_template' },
          { id: 'logs-foo.bar', type: 'index_template' },
        ],
      },
    ]);
    templates({
      'logs-foo': { index_patterns: ['logs-foo.*-*'], priority: 150 },
      'logs-foo.bar': { index_patterns: ['logs-foo.bar-*'], priority: 200 },
    });

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.conflicts).toEqual([]);
    expect(result.created).toBe(2);
  });

  it('skips namespace template references', async () => {
    installed([
      {
        name: 'a',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-x@namespace.prod', type: 'index_template' }],
      },
    ]);
    templates({});

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.created).toBe(0);
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('skips a reference whose template no longer exists in Elasticsearch', async () => {
    installed([
      {
        name: 'a',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-gone', type: 'index_template' }],
      },
    ]);
    templates({});

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.created).toBe(0);
    expect(result.skipped).toEqual(['logs-gone']);
  });

  it('does not count an existing same-owner claim as newly created', async () => {
    installed([
      {
        name: 'a',
        version: '1',
        install_source: 'registry',
        installed_es: [{ id: 'logs-x', type: 'index_template' }],
      },
    ]);
    templates({ 'logs-x': { index_patterns: ['logs-x-*'], priority: 200 } });
    soClient.create.mockRejectedValue(SavedObjectsErrorHelpers.createConflictError('t', 'logs-x'));
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'a', status: 'active', index_patterns: ['logs-x-*'] },
    } as never);

    const result = await backfillDatasetClaims(soClient, esClient, logger);

    expect(result.created).toBe(0);
  });
});

describe('sweepOrphanedDatasetClaims', () => {
  it('deletes a pending claim for a package that is not installed', async () => {
    soClient.find
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'logs-gone',
            attributes: { package_name: 'gone', status: 'pending', origin: 'install' },
          },
        ],
      } as never)
      .mockResolvedValueOnce({ saved_objects: [] } as never);

    const result = await sweepOrphanedDatasetClaims(soClient, logger);

    expect(result.deleted).toEqual(['logs-gone']);
    expect(soClient.delete).toHaveBeenCalledWith('fleet-dataset-claims', 'logs-gone');
  });

  it('keeps a pending claim whose package is installed', async () => {
    soClient.find
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'logs-live',
            attributes: { package_name: 'live', status: 'pending', origin: 'install' },
          },
        ],
      } as never)
      .mockResolvedValueOnce({ saved_objects: [{ attributes: { name: 'live' } }] } as never);

    const result = await sweepOrphanedDatasetClaims(soClient, logger);

    expect(result.deleted).toEqual([]);
    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('never deletes an adoption claim, which is created before the package exists', async () => {
    soClient.find
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'logs-adopted',
            attributes: { package_name: 'not-installed', status: 'pending', origin: 'adoption' },
          },
          {
            id: 'logs-orphan',
            attributes: { package_name: 'gone', status: 'pending', origin: 'install' },
          },
        ],
      } as never)
      .mockResolvedValueOnce({ saved_objects: [] } as never);

    const result = await sweepOrphanedDatasetClaims(soClient, logger);

    expect(result.deleted).toEqual(['logs-orphan']);
    const filter = soClient.find.mock.calls[0][0].filter as string;
    expect(filter).toContain('status');
    expect(filter).not.toContain('origin');
  });
});
