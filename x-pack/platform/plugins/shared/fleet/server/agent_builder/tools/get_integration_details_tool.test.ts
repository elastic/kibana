/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { FleetAuthz, PackageListItem, PackagePolicy } from '../../../common';
import type { PackageService } from '../../services/epm/package_service';
import type { PackagePolicyService } from '../../services/package_policy_service';
import { getIntegrationDetailsTool } from './get_integration_details_tool';

const request = httpServerMock.createKibanaRequest();
const savedObjectsClient = savedObjectsClientMock.create();
const logger = loggingSystemMock.createLogger();
const getPackages = jest.fn();
const listPackagePolicies = jest.fn();
const getAuthz = jest.fn();
const packageService = {
  asScoped: () => ({ getPackages }),
} as unknown as PackageService;
const packagePolicyService = {
  asScoped: () => ({ list: listPackagePolicies }),
} as unknown as PackagePolicyService;

const context = {
  request,
  savedObjectsClient,
  spaceId: 'default',
} as never;

const authz = (allowed: boolean) =>
  ({
    integrations: {
      readPackageInfo: allowed,
      readIntegrationPolicies: allowed,
    },
  } as FleetAuthz);

describe('getIntegrationDetailsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuthz.mockResolvedValue(authz(true));
    getPackages.mockResolvedValue([
      {
        name: 'system',
        title: 'System',
        version: '2.0.0',
        status: 'installed',
        installationInfo: { version: '1.0.0' },
        policy_templates: [
          { name: 'logs', title: 'System logs' },
          { name: 'metrics', title: 'System metrics' },
        ],
      },
      {
        name: 'endpoint',
        title: 'Elastic Defend',
        version: '9.0.0',
        status: 'not_installed',
        policy_templates: [],
      },
    ] as PackageListItem[]);
    listPackagePolicies.mockResolvedValue({
      items: [
        {
          package: { name: 'system' },
          inputs: [{ enabled: true, policy_template: 'logs', type: 'logfile' }],
        },
      ] as PackagePolicy[],
    });
  });

  const tool = () =>
    getIntegrationDetailsTool({
      getPackageService: () => packageService,
      getPackagePolicyService: () => packagePolicyService,
      getAuthz,
      logger,
    });

  it('returns flattened installed, enabled, disabled, and uninstalled details', async () => {
    const result = (await tool().handler(
      { package_names: ['system', 'endpoint'], page: 1, per_page: 100 },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({
      total: 3,
      page: 1,
      per_page: 100,
      integrations: [
        expect.objectContaining({
          package_name: 'endpoint',
          is_installed: false,
          is_enabled: false,
        }),
        expect.objectContaining({
          package_name: 'system',
          integration_name: 'logs',
          installed_package_version: '1.0.0',
          is_installed: true,
          is_enabled: true,
        }),
        expect.objectContaining({
          package_name: 'system',
          integration_name: 'metrics',
          is_enabled: false,
        }),
      ],
      not_found: [],
    });
  });

  it('reports unknown package identifiers without failing known identifiers', async () => {
    const result = (await tool().handler(
      { package_names: ['system', 'missing'], page: 1, per_page: 20 },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].data).toEqual(
      expect.objectContaining({ total: 2, not_found: ['missing'] })
    );
  });

  it('returns a clear privilege error before reading Fleet data', async () => {
    getAuthz.mockResolvedValue(authz(false));

    const result = (await tool().handler(
      { page: 1, per_page: 20 },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('Agent Policies: Read') })
    );
    expect(getPackages).not.toHaveBeenCalled();
  });

  it('bounds identifiers and page size', () => {
    expect(
      tool().schema.safeParse({
        package_names: Array.from({ length: 101 }, (_, index) => `${index}`),
      }).success
    ).toBe(false);
    expect(tool().schema.safeParse({ per_page: 101 }).success).toBe(false);
  });

  it('returns an error when Fleet services are unavailable', async () => {
    const unavailableTool = getIntegrationDetailsTool({
      getPackageService: () => undefined,
      getPackagePolicyService: () => undefined,
      getAuthz,
      logger,
    });

    const result = (await unavailableTool.handler(
      { page: 1, per_page: 20 },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('not available') })
    );
  });
});
