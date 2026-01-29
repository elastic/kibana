/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../../services';
import { rollbackInstallation } from '../../services/epm/packages/rollback';

import { _runBulkRollbackTask } from './run_bulk_rollback';

jest.mock('../../services/epm/packages/rollback');

describe('Bulk rollback task', () => {
  beforeEach(() => {
    const mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);

    jest.mocked(rollbackInstallation).mockReset();
    jest.mocked(rollbackInstallation).mockImplementation(async (params) => {
      if (!('pkgName' in params)) {
        throw new Error('Invalid call to rollbackInstallation');
      }

      if (params.pkgName.startsWith('test_valid')) {
        return {
          status: true,
        } as any;
      }

      if (params.pkgName.startsWith('test_invalid')) {
        throw new Error('Impossible to rollback: ' + params.pkgName);
      }

      throw new Error('not implemented');
    });
  });
  describe('_runBulkRollbackTask', () => {
    it('should work for successful rollback', async () => {
      const res = await _runBulkRollbackTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_rollback',
          packages: [{ name: 'test_valid' }],
          packagePolicyIdsForCurrentUser: {},
        },
      });

      expect(rollbackInstallation).toBeCalled();

      expect(res).toEqual([{ name: 'test_valid', success: true }]);
    });

    it('should return error for non successful rollback', async () => {
      const res = await _runBulkRollbackTask({
        abortController: new AbortController(),
        logger: loggingSystemMock.createLogger(),
        taskParams: {
          type: 'bulk_rollback',
          packages: [
            { name: 'test_valid_1' },
            { name: 'test_invalid_1' },
            { name: 'test_valid_2' },
            { name: 'test_invalid_2' },
          ],
          packagePolicyIdsForCurrentUser: {},
        },
      });

      expect(rollbackInstallation).toBeCalledTimes(4);
      expect(res).toEqual([
        { name: 'test_valid_1', success: true },
        {
          name: 'test_invalid_1',
          success: false,
          error: { message: 'Impossible to rollback: test_invalid_1' },
        },
        { name: 'test_valid_2', success: true },
        {
          name: 'test_invalid_2',
          success: false,
          error: { message: 'Impossible to rollback: test_invalid_2' },
        },
      ]);
    });

    it('should not continue to rollback packages when task is cancelled', async () => {
      const abortController = new AbortController();
      abortController.abort();
      await expect(() =>
        _runBulkRollbackTask({
          abortController,
          logger: loggingSystemMock.createLogger(),
          taskParams: {
            type: 'bulk_rollback',
            packages: [
              { name: 'test_valid_1' },
              { name: 'test_invalid_1' },
              { name: 'test_valid_2' },
              { name: 'test_invalid_2' },
            ],
            packagePolicyIdsForCurrentUser: {},
          },
        })
      ).rejects.toThrow(/Task was aborted/);

      expect(rollbackInstallation).toBeCalledTimes(0);
    });
  });
});
