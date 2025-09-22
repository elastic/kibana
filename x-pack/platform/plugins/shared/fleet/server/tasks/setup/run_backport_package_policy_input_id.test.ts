/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import { packagePolicyService } from '../../services';

import { _runBackportPackagePolicyInputId } from './run_backport_package_policy_input_id';

jest.mock('../../services/package_policy');
jest.mock('../../services/epm/packages/get');

describe('_runBackportPackagePolicyInputId', () => {
  it('should do nothing if package policies already have input ids', async () => {
    const soClient = savedObjectsClientMock.create();
    const logger = loggingSystemMock.createLogger();

    jest.mocked(packagePolicyService.fetchAllItems).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'package-policy-1',
            inputs: [
              {
                type: 'logfile',
                enabled: true,
                id: 'input-id-1',
                streams: [],
                package: { name: 'test', version: '1.0.0' },
              },
            ],
          } as any,
        ];
      })()
    );
    await _runBackportPackagePolicyInputId(
      soClient,
      elasticsearchServiceMock.createClusterClient().asInternalUser,
      logger
    );

    expect(soClient.bulkUpdate).not.toHaveBeenCalled();
  });

  it('should backport package policies without input ids', async () => {
    const soClient = savedObjectsClientMock.create();
    const logger = loggingSystemMock.createLogger();

    jest.mocked(packagePolicyService.fetchAllItems).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'package-policy-1',
            inputs: [{ enabled: true, type: 'logfile', streams: [] }],
            package: { name: 'test', version: '1.0.0' },
          } as any,
        ];
      })()
    );
    await _runBackportPackagePolicyInputId(
      soClient,
      elasticsearchServiceMock.createClusterClient().asInternalUser,
      logger
    );

    expect(soClient.bulkUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'package-policy-1',
          attributes: expect.objectContaining({
            inputs: [
              { enabled: true, type: 'logfile', id: 'logfile-package-policy-1', streams: [] },
            ],
          }),
        }),
      ])
    );
  });

  it('should allow to abort the task', async () => {
    const soClient = savedObjectsClientMock.create();
    const logger = loggingSystemMock.createLogger();

    jest.mocked(packagePolicyService.fetchAllItems).mockResolvedValueOnce(
      (async function* () {
        yield [
          {
            id: 'package-policy-1',
            inputs: [{ enabled: true, type: 'logfile', streams: [] }],
            package: { name: 'test', version: '1.0.0' },
          } as any,
        ];
      })()
    );
    const abortController = new AbortController();
    abortController.abort();
    await expect(
      _runBackportPackagePolicyInputId(
        soClient,
        elasticsearchServiceMock.createClusterClient().asInternalUser,
        logger,
        abortController
      )
    ).rejects.toThrow(/Task was aborted/);

    expect(soClient.bulkUpdate).not.toHaveBeenCalled();
  });
});
