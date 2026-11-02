/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { getInstallation, getPackageInfo, installPackage } from '../epm/packages';
import * as Registry from '../epm/registry';

import { hasBreakingChanges, pickRegistryTarget, runAgentlessAutoUpgrade } from './auto_upgrade';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../package_policy');
jest.mock('../epm/packages');
jest.mock('../epm/registry');
jest.mock('../epm/archive/storage');
jest.mock('../epm/packages/cache', () => ({ runWithCache: (fn: () => unknown) => fn() }));
jest.mock('./agentless_policies', () => ({ getAgentlessAgentPolicyConfig: () => undefined }));

const mockGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;
const mockGetPackageInfo = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;
const mockInstallPackage = installPackage as jest.MockedFunction<typeof installPackage>;
const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockRegistry = Registry as jest.Mocked<typeof Registry>;

const CHANGELOG_OK = `
- version: "3.5.0"
  changes:
    - description: New option
      type: enhancement
      link: https://example.com
`;

function mockPackagePolicies(policies: Array<Record<string, unknown>>) {
  mockPackagePolicyService.fetchAllItems.mockImplementation(async () =>
    (async function* () {
      yield policies as any;
    })()
  );
}

describe('pickRegistryTarget', () => {
  it('picks the newest version in range on the installed major', () => {
    expect(
      pickRegistryTarget('3.4.0', ['3.4.0', '3.4.1', '3.5.0', '3.6.0', '4.0.0'], '>=3.4.0 <3.6.0')
    ).toBe('3.5.0');
  });

  it('never crosses the installed major even if the range allows it', () => {
    expect(pickRegistryTarget('3.4.0', ['4.0.0', '4.1.0'], '>=3.0.0')).toBeUndefined();
  });

  it('ignores prerelease and older versions', () => {
    expect(pickRegistryTarget('3.4.0', ['3.3.0', '3.5.0-preview1'], '^3.0.0')).toBeUndefined();
  });
});

describe('hasBreakingChanges', () => {
  const changelog = [
    { version: '3.6.0', changes: [{ type: 'breaking-change' }] },
    { version: '3.5.0', changes: [{ type: 'enhancement' }] },
    { version: '3.4.0', changes: [{ type: 'breaking-change' }] },
  ];

  it('detects breaking changes after the current version up to the target', () => {
    expect(hasBreakingChanges(changelog, '3.4.0', '3.6.0')).toBe(true);
  });

  it('ignores breaking changes at or before the current version and after the target', () => {
    expect(hasBreakingChanges(changelog, '3.4.0', '3.5.0')).toBe(false);
  });

  it('returns false for unexpected changelog content', () => {
    expect(hasBreakingChanges({ not: 'a list' }, '1.0.0', '2.0.0')).toBe(false);
  });
});

describe('runAgentlessAutoUpgrade', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.resetAllMocks();
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      {}
    );
    (appContextService.getInternalUserSOClientForSpaceId as jest.Mock).mockReturnValue({});
    (appContextService.getInternalUserESClient as jest.Mock).mockReturnValue({});
    mockGetInstallation.mockResolvedValue({
      name: 'aws',
      version: '3.4.0',
      install_status: 'installed',
      install_source: 'registry',
    } as any);
    mockRegistry.fetchList.mockResolvedValue([
      { name: 'aws', version: '3.4.0' },
      { name: 'aws', version: '3.5.0' },
    ] as any);
    mockRegistry.pkgToPkgKey.mockImplementation(({ name, version }) => `${name}-${version}`);
    mockRegistry.getFile.mockResolvedValue({ text: async () => CHANGELOG_OK } as any);
    mockGetPackageInfo.mockResolvedValue({ name: 'aws' } as any);
    mockPackagePolicyService.getUpgradeDryRunDiff.mockResolvedValue({ hasErrors: false } as any);
    mockPackagePolicyService.bulkUpgrade.mockResolvedValue([{ id: 'pp-1', success: true }] as any);
    mockInstallPackage.mockResolvedValue({ status: 'installed' } as any);
    (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([]);
  });

  const config = { dryRun: false, packages: [{ name: 'aws', versionRange: '^3.0.0' }] };

  it('installs the target version and upgrades agentless package policies', async () => {
    mockPackagePolicies([
      { id: 'pp-1', supports_agentless: true, package: { version: '3.4.0' }, policy_ids: ['ap'] },
    ]);

    const [result] = await runAgentlessAutoUpgrade({ config, logger });

    expect(result).toMatchObject({ status: 'upgraded', targetVersion: '3.5.0' });
    expect(mockInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({ pkgkey: 'aws-3.5.0', allowOutdatedVersion: true })
    );
    expect(mockPackagePolicyService.bulkUpgrade).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['pp-1'],
      { force: true },
      '3.5.0'
    );
  });

  it('does not change anything in dry run mode', async () => {
    mockPackagePolicies([{ id: 'pp-1', supports_agentless: true, package: { version: '3.4.0' } }]);

    const [result] = await runAgentlessAutoUpgrade({
      config: { ...config, dryRun: true },
      logger,
    });

    expect(result.status).toBe('would_upgrade');
    expect(mockInstallPackage).not.toHaveBeenCalled();
    expect(mockPackagePolicyService.bulkUpgrade).not.toHaveBeenCalled();
  });

  it('skips packages also used by non-agentless package policies', async () => {
    mockPackagePolicies([
      { id: 'pp-1', supports_agentless: true, package: { version: '3.4.0' } },
      { id: 'pp-2', supports_agentless: false, package: { version: '3.4.0' } },
    ]);

    const [result] = await runAgentlessAutoUpgrade({ config, logger });

    expect(result).toMatchObject({
      status: 'skipped',
      reason: 'package is also used by non-agentless package policies',
    });
    expect(mockInstallPackage).not.toHaveBeenCalled();
  });

  it('skips when a dry run upgrade reports conflicts', async () => {
    mockPackagePolicies([{ id: 'pp-1', supports_agentless: true, package: { version: '3.4.0' } }]);
    mockPackagePolicyService.getUpgradeDryRunDiff.mockResolvedValue({ hasErrors: true } as any);

    const [result] = await runAgentlessAutoUpgrade({ config, logger });

    expect(result).toMatchObject({ status: 'skipped', reason: 'upgrade conflicts in pp-1' });
    expect(mockInstallPackage).not.toHaveBeenCalled();
  });

  it('skips when the changelog lists a breaking change', async () => {
    mockPackagePolicies([{ id: 'pp-1', supports_agentless: true, package: { version: '3.4.0' } }]);
    mockRegistry.getFile.mockResolvedValue({
      text: async () => `
- version: "3.5.0"
  changes:
    - description: Renamed fields
      type: breaking-change
      link: https://example.com
`,
    } as any);

    const [result] = await runAgentlessAutoUpgrade({ config, logger });

    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('breaking change');
    expect(mockInstallPackage).not.toHaveBeenCalled();
  });

  it('only upgrades policies for uploaded packages without contacting the registry', async () => {
    mockGetInstallation.mockResolvedValue({
      name: 'aws',
      version: '3.5.0',
      install_status: 'installed',
      install_source: 'upload',
    } as any);
    mockPackagePolicies([{ id: 'pp-1', supports_agentless: true, package: { version: '3.4.0' } }]);
    const storage = jest.requireMock('../epm/archive/storage');
    storage.getAsset.mockResolvedValue({ data_utf8: CHANGELOG_OK });

    const [result] = await runAgentlessAutoUpgrade({ config, logger });

    expect(result).toMatchObject({ status: 'upgraded', targetVersion: '3.5.0' });
    expect(mockRegistry.fetchList).not.toHaveBeenCalled();
    expect(mockInstallPackage).not.toHaveBeenCalled();
    expect(mockPackagePolicyService.bulkUpgrade).toHaveBeenCalled();
  });
});
