/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../../services';
import { packagePolicyService } from '../../services/package_policy';
import { installPackage } from '../../services/epm/packages';

import { _runBulkUpgradeTask } from './run_bulk_upgrade';

jest.mock('../../services/epm/packages');
jest.mock('../../services/package_policy');

describe('Bulk upgrade task', () => {
  beforeEach(() => {
    const mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);

    jest.mocked(installPackage).mockReset();
    jest.mocked(installPackage).mockImplementation(async (params) => {
      if (!('pkgkey' in params)) {
        throw new Error('Invalid call to installPackage');
      }

      if (params.pkgkey.startsWith('test_valid')) {
        return {
          status: 'installed',
        } as any;
      }

      if (params.pkgkey.startsWith('test_invalid')) {
        return {
          error: new Error('Impossible to install: ' + params.pkgkey),
        };
      }

      throw new Error('not implemented');
    });

    jest.mocked(packagePolicyService.listIds).mockResolvedValue({ items: ['id1', 'id2'] } as any);

    jest
      .mocked(packagePolicyService.bulkUpgrade)
      .mockResolvedValue([{ success: true }, { success: true }] as any);
  });
  describe('_runBulkUpgradeTask', () => {
    it('should work for successfull upgrade', async () => {
      const res = await _runBulkUpgradeTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_upgrade',
          packages: [{ name: 'test_valid' }],
        },
        request: {} as KibanaRequest,
      });

      expect(installPackage).toBeCalled();

      expect(res).toEqual([{ name: 'test_valid', success: true }]);
    });

    it('should return error for non successful upgrade', async () => {
      const res = await _runBulkUpgradeTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_upgrade',
          packages: [
            { name: 'test_valid_1' },
            { name: 'test_invalid_1' },
            { name: 'test_valid_2' },
            { name: 'test_invalid_2' },
          ],
        },
        request: {} as KibanaRequest,
      });

      expect(installPackage).toBeCalledTimes(4);
      expect(res).toEqual([
        { name: 'test_valid_1', success: true },
        {
          name: 'test_invalid_1',
          success: false,
          error: { message: 'Impossible to install: test_invalid_1' },
        },
        { name: 'test_valid_2', success: true },
        {
          name: 'test_invalid_2',
          success: false,
          error: { message: 'Impossible to install: test_invalid_2' },
        },
      ]);
    });

    it('should work for successful upgrade with package policies upgrade', async () => {
      const res = await _runBulkUpgradeTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_upgrade',
          packages: [{ name: 'test_valid' }],
          upgradePackagePolicies: true,
        },
        request: {} as KibanaRequest,
      });

      expect(res).toEqual([{ name: 'test_valid', success: true }]);

      expect(installPackage).toBeCalled();
      expect(packagePolicyService.bulkUpgrade).toBeCalled();
    });

    it('should not continue to upgrade packages when task is cancelled', async () => {
      const abortController = new AbortController();
      abortController.abort();
      await expect(() =>
        _runBulkUpgradeTask({
          abortController,
          logger: loggingSystemMock.createLogger(),
          taskParams: {
            type: 'bulk_upgrade',
            packages: [
              { name: 'test_valid_1' },
              { name: 'test_invalid_1' },
              { name: 'test_valid_2' },
              { name: 'test_invalid_2' },
            ],
          },
          request: {} as KibanaRequest,
        })
      ).rejects.toThrow(/Task was aborted/);

      expect(installPackage).toBeCalledTimes(0);
    });
  });
});
