/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { AgentlessDeploymentReleaseStatus } from '../../../common/types';
import { FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE } from '../../../common/constants';

import { appContextService } from '../../services';

import * as Registry from '../../services/epm/registry';

import { runBackfillInstalledPackageInfo } from './run_backfill_installed_package_info';

jest.mock('../../services/app_context');
jest.mock('../../services/epm/registry');

const MockRegistry = Registry as jest.Mocked<typeof Registry>;

describe('runBackfillInstalledPackageInfo', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let abortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();
    soClient = savedObjectsClientMock.create();
    abortController = new AbortController();
    jest
      .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
      .mockReturnValue(soClient);
  });

  it('should do nothing when no packages need backfilling', async () => {
    soClient.find.mockResolvedValue({ total: 0, saved_objects: [], page: 1, per_page: 0 });

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(MockRegistry.fetchInfo).not.toHaveBeenCalled();
    expect(soClient.bulkUpdate).not.toHaveBeenCalled();
  });

  it('should exclude uploaded packages via the SO query filter', async () => {
    soClient.find.mockResolvedValue({ total: 0, saved_objects: [], page: 1, per_page: 0 });

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('install_source:registry'),
      })
    );
  });

  it('should fetch registry info and call bulkUpdate for registry packages', async () => {
    soClient.find.mockResolvedValue({
      total: 1,
      page: 1,
      per_page: 1,
      saved_objects: [
        {
          id: 'pkg-1',
          type: 'epm-packages',
          references: [],
          attributes: { name: 'my_pkg', version: '1.0.0', install_source: 'registry' },
        } as any,
      ],
    });

    MockRegistry.fetchInfo.mockResolvedValue({
      policy_templates: [
        {
          name: 'tmpl',
          deployment_modes: { agentless: { enabled: true }, default: { enabled: true } },
        },
      ],
    } as any);

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(MockRegistry.fetchInfo).toHaveBeenCalledWith('my_pkg', '1.0.0');
    expect(soClient.bulkUpdate).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'pkg-1',
        attributes: {
          policy_templates_deployment_info: [
            {
              name: 'tmpl',
              deployment_modes: { agentless: { enabled: true }, default: { enabled: true } },
            },
          ],
        },
      }),
    ]);
  });

  it('should warn and continue when registry fetch fails', async () => {
    soClient.find.mockResolvedValue({
      total: 1,
      page: 1,
      per_page: 1,
      saved_objects: [
        {
          id: 'pkg-1',
          type: 'epm-packages',
          references: [],
          attributes: { name: 'my_pkg', version: '1.0.0', install_source: 'registry' },
        } as any,
      ],
    });

    MockRegistry.fetchInfo.mockRejectedValue(new Error('not found'));

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('my_pkg@1.0.0'));
    expect(soClient.bulkUpdate).not.toHaveBeenCalled();
  });

  it('should stop processing when abort signal is triggered', async () => {
    soClient.find.mockResolvedValue({
      total: 2,
      page: 1,
      per_page: 2,
      saved_objects: [
        {
          id: 'pkg-1',
          type: 'epm-packages',
          references: [],
          attributes: { name: 'pkg_a', version: '1.0.0', install_source: 'registry' },
        } as any,
        {
          id: 'pkg-2',
          type: 'epm-packages',
          references: [],
          attributes: { name: 'pkg_b', version: '1.0.0', install_source: 'registry' },
        } as any,
      ],
    });

    MockRegistry.fetchInfo.mockImplementation(async () => {
      abortController.abort();
      return { policy_templates: [] } as any;
    });

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(MockRegistry.fetchInfo).toHaveBeenCalledTimes(1);
  });

  it('should use the correct fields and filter in the SO find query', async () => {
    soClient.find.mockResolvedValue({ total: 0, saved_objects: [], page: 1, per_page: 0 });

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ['name', 'version'],
        filter: expect.stringContaining('install_source:registry'),
      })
    );
  });

  it('should apply GA release override for CSPM policy template when release is absent', async () => {
    soClient.find.mockResolvedValue({
      total: 1,
      page: 1,
      per_page: 1,
      saved_objects: [
        {
          id: 'cspm-pkg',
          type: 'epm-packages',
          references: [],
          attributes: {
            name: 'cloud_security_posture',
            version: '1.0.0',
            install_source: 'registry',
          },
        } as any,
      ],
    });

    MockRegistry.fetchInfo.mockResolvedValue({
      policy_templates: [
        {
          name: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
          deployment_modes: { agentless: { enabled: true } },
        },
      ],
    } as any);

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(soClient.bulkUpdate).toHaveBeenCalledWith([
      expect.objectContaining({
        attributes: {
          policy_templates_deployment_info: [
            {
              name: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
              deployment_modes: {
                agentless: { enabled: true, release: AgentlessDeploymentReleaseStatus.GA },
              },
            },
          ],
        },
      }),
    ]);
  });

  it('should not apply GA override for CSPM when agentless deployment mode is absent', async () => {
    soClient.find.mockResolvedValue({
      total: 1,
      page: 1,
      per_page: 1,
      saved_objects: [
        {
          id: 'cspm-pkg',
          type: 'epm-packages',
          references: [],
          attributes: {
            name: 'cloud_security_posture',
            version: '2.0.0',
            install_source: 'registry',
          },
        } as any,
      ],
    });

    MockRegistry.fetchInfo.mockResolvedValue({
      policy_templates: [
        {
          name: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
          deployment_modes: { default: { enabled: true } },
        },
      ],
    } as any);

    await runBackfillInstalledPackageInfo({ logger, abortController });

    expect(soClient.bulkUpdate).toHaveBeenCalledWith([
      expect.objectContaining({
        attributes: {
          policy_templates_deployment_info: [
            {
              name: FLEET_CLOUD_SECURITY_POSTURE_CSPM_POLICY_TEMPLATE,
              deployment_modes: { default: { enabled: true } },
            },
          ],
        },
      }),
    ]);
  });
});
