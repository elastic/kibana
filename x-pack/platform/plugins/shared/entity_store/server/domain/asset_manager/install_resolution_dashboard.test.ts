/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ISavedObjectsImporter, SavedObjectsClientContract } from '@kbn/core/server';
import { ensureResolutionRuleMonitoringDashboard } from './install_resolution_dashboard';

const notFound = () => SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'x');

const run = (get: jest.Mock, importFn: jest.Mock) => {
  const logger = loggerMock.create();
  return {
    logger,
    result: ensureResolutionRuleMonitoringDashboard({
      savedObjectsClient: { get } as unknown as SavedObjectsClientContract,
      savedObjectsImporter: { import: importFn } as unknown as ISavedObjectsImporter,
      spaceId: 'default',
      logger,
    }),
  };
};

describe('ensureResolutionRuleMonitoringDashboard', () => {
  it('does not import anything when the dashboard is already there', async () => {
    const get = jest.fn().mockResolvedValue({});
    const importFn = jest.fn();

    await expect(run(get, importFn).result).resolves.toBe(true);

    expect(get).toHaveBeenCalledWith(
      'dashboard',
      'entity-store-resolution-rule-monitoring-default'
    );
    expect(importFn).not.toHaveBeenCalled();
  });

  it('imports the data view and the dashboard as managed objects when it is missing', async () => {
    const get = jest.fn().mockRejectedValue(notFound());
    const importFn = jest.fn().mockResolvedValue({ success: true, errors: [] });

    await expect(run(get, importFn).result).resolves.toBe(true);

    expect(importFn).toHaveBeenCalledTimes(1);
    expect(importFn.mock.calls[0][0]).toMatchObject({
      managed: true,
      overwrite: true,
      createNewCopies: false,
    });
  });

  it('returns false and warns when the import is rejected, without throwing', async () => {
    const get = jest.fn().mockRejectedValue(notFound());
    const importFn = jest.fn().mockResolvedValue({
      success: false,
      errors: [{ type: 'dashboard', id: 'd', error: { type: 'unsupported_type' } }],
    });
    const { logger, result } = run(get, importFn);

    await expect(result).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('dashboard:d'));
  });

  it('returns false and warns when the import throws, without throwing', async () => {
    const get = jest.fn().mockRejectedValue(notFound());
    const importFn = jest.fn().mockRejectedValue(new Error('forbidden'));
    const { logger, result } = run(get, importFn);

    await expect(result).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });

  it('returns false and does not import when the lookup fails for another reason', async () => {
    const get = jest.fn().mockRejectedValue(new Error('cluster down'));
    const importFn = jest.fn();
    const { logger, result } = run(get, importFn);

    await expect(result).resolves.toBe(false);
    expect(importFn).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster down'));
  });
});
