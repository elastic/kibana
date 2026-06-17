/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../../services';
import { removeInstallation } from '../../services/epm/packages';

import { _runBulkUninstallTask } from './run_bulk_uninstall';

jest.mock('../../services/epm/packages');
jest.mock('../../services/package_policy');

describe('Bulk uninstall task', () => {
  beforeEach(() => {
    const mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);

    jest.mocked(removeInstallation).mockReset();
    jest.mocked(removeInstallation).mockImplementation(async (params) => {
      if (params.pkgName.startsWith('test_valid')) {
        return {
          status: 'installed',
        } as any;
      }

      if (params.pkgName.startsWith('test_invalid')) {
        throw new Error('Impossible to remove: ' + params.pkgName);
      }

      throw new Error('not implemented');
    });
  });
  describe('_runBulkUninstallTask', () => {
    it('should work for successfull uninstall', async () => {
      const res = await _runBulkUninstallTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_uninstall',
          packages: [
            { name: 'test_valid_1', version: '1.0.0' },
            { name: 'test_valid_2', version: '1.0.0' },
          ],
        },
      });

      expect(removeInstallation).toBeCalledTimes(2);

      expect(res).toEqual([
        { name: 'test_valid_1', success: true },
        { name: 'test_valid_2', success: true },
      ]);
    });

    it('should return error for non successful upgrade', async () => {
      const res = await _runBulkUninstallTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_uninstall',
          packages: [
            { name: 'test_valid_1', version: '1.0.0' },
            { name: 'test_invalid_1', version: '1.0.0' },
            { name: 'test_valid_2', version: '1.0.0' },
            { name: 'test_invalid_2', version: '1.0.0' },
          ],
        },
      });

      expect(removeInstallation).toBeCalledTimes(4);
      expect(res).toEqual([
        { name: 'test_valid_1', success: true },
        {
          name: 'test_invalid_1',
          success: false,
          error: { message: 'Impossible to remove: test_invalid_1' },
        },
        { name: 'test_valid_2', success: true },
        {
          name: 'test_invalid_2',
          success: false,
          error: { message: 'Impossible to remove: test_invalid_2' },
        },
      ]);
    });

    it('should not continue to upgrade packages when task is cancelled', async () => {
      const abortController = new AbortController();
      abortController.abort();
      await expect(() =>
        _runBulkUninstallTask({
          abortController,
          logger: loggingSystemMock.createLogger(),
          taskParams: {
            type: 'bulk_uninstall',
            packages: [
              { name: 'test_valid_1', version: '1.0.0' },
              { name: 'test_invalid_1', version: '1.0.0' },
              { name: 'test_valid_2', version: '1.0.0' },
              { name: 'test_invalid_2', version: '1.0.0' },
            ],
          },
        })
      ).rejects.toThrow(/Task was aborted/);

      expect(removeInstallation).toBeCalledTimes(0);
    });
  });
});
