/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '../../../../common/types';
import { PackageBreakingChangesNotAcknowledgedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { createArchiveIteratorFromMap } from '../archive/archive_iterator';
import { getAsset } from '../archive/storage';
import * as Registry from '../registry';

import {
  assertBreakingChangesAcknowledged,
  assertPackagePoliciesUpgradeAcknowledged,
  getBreakingChangesForUpgrade,
  getPackagePoliciesUpgradeBreakingChanges,
} from './breaking_changes';
import { getInstallation } from './get';

jest.mock('../../app_context');
jest.mock('../archive/storage');
jest.mock('../registry');
jest.mock('./get');

const CHANGELOG = `
- version: "3.0.0"
  changes:
    - description: Removed the foo input.
      type: breaking-change
      link: https://github.com/elastic/integrations/pull/3
- version: "2.1.0"
  changes:
    - description: Added bar.
      type: enhancement
      link: https://github.com/elastic/integrations/pull/21
- version: "2.0.0"
  changes:
    - description: Renamed the baz field.
      type: breaking-change
      link: https://github.com/elastic/integrations/pull/2
- version: "1.0.0"
  changes:
    - description: Initial release.
      type: enhancement
      link: https://github.com/elastic/integrations/pull/1
`;

const archiveIteratorWithChangelog = (pkgName: string, pkgVersion: string, changelog = CHANGELOG) =>
  createArchiveIteratorFromMap(
    new Map([
      [`${pkgName}-${pkgVersion}/manifest.yml`, Buffer.from('name: test')],
      [`${pkgName}-${pkgVersion}/changelog.yml`, Buffer.from(changelog)],
    ])
  );

const packagePolicy = (id: string, pkgName: string, version: string) =>
  ({ id, name: id, package: { name: pkgName, title: pkgName, version } } as PackagePolicy);

describe('breaking changes', () => {
  const logger = { warn: jest.fn(), debug: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(appContextService.getLogger).mockReturnValue(logger as any);
    jest
      .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension)
      .mockReturnValue({} as any);
  });

  describe('getBreakingChangesForUpgrade', () => {
    it('should return the breaking changes of the upgrade range from the archive', async () => {
      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '2.0.0',
        toVersion: '3.0.0',
        archiveIterator: archiveIteratorWithChangelog('test', '3.0.0'),
      });

      expect(breakingChanges).toEqual([
        {
          version: '3.0.0',
          changes: [
            {
              description: 'Removed the foo input.',
              type: 'breaking-change',
              link: 'https://github.com/elastic/integrations/pull/3',
            },
          ],
        },
      ]);
      expect(getAsset).not.toHaveBeenCalled();
      expect(Registry.getPackage).not.toHaveBeenCalled();
    });

    it('should return no breaking changes when upgrading within a range without breaking changes', async () => {
      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '2.0.0',
        toVersion: '2.1.0',
        archiveIterator: archiveIteratorWithChangelog('test', '2.1.0'),
      });

      expect(breakingChanges).toEqual([]);
    });

    it('should return no breaking changes when the target version is not greater', async () => {
      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '3.0.0',
        toVersion: '2.0.0',
        archiveIterator: archiveIteratorWithChangelog('test', '2.0.0'),
      });

      expect(breakingChanges).toEqual([]);
    });

    it('should return no breaking changes when the package has no changelog', async () => {
      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '1.0.0',
        toVersion: '3.0.0',
        archiveIterator: createArchiveIteratorFromMap(new Map()),
      });

      expect(breakingChanges).toEqual([]);
    });

    it('should log and return no breaking changes when the changelog is malformed', async () => {
      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '1.0.0',
        toVersion: '3.0.0',
        archiveIterator: archiveIteratorWithChangelog('test', '3.0.0', 'foo: [bar'),
      });

      expect(breakingChanges).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unable to read the changelog of test-3.0.0')
      );
    });

    it('should read the changelog from the installed package assets when no archive is provided', async () => {
      jest.mocked(getAsset).mockResolvedValue({ data_utf8: CHANGELOG } as any);

      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '1.0.0',
        toVersion: '3.0.0',
      });

      expect(getAsset).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'test-3.0.0/changelog.yml' })
      );
      expect(Registry.getPackage).not.toHaveBeenCalled();
      expect(breakingChanges.map(({ version }) => version)).toEqual(['3.0.0', '2.0.0']);
    });

    it('should fall back to the registry when the changelog asset is missing', async () => {
      jest.mocked(getAsset).mockResolvedValue(undefined);
      jest.mocked(Registry.getPackage).mockResolvedValue({
        archiveIterator: archiveIteratorWithChangelog('test', '3.0.0'),
      } as any);

      const breakingChanges = await getBreakingChangesForUpgrade({
        pkgName: 'test',
        fromVersion: '2.1.0',
        toVersion: '3.0.0',
      });

      expect(Registry.getPackage).toHaveBeenCalledWith('test', '3.0.0', { useStreaming: true });
      expect(breakingChanges.map(({ version }) => version)).toEqual(['3.0.0']);
    });
  });

  describe('assertBreakingChangesAcknowledged', () => {
    it('should throw an error listing the breaking changes', async () => {
      const promise = assertBreakingChangesAcknowledged({
        pkgName: 'test',
        fromVersion: '1.0.0',
        toVersion: '3.0.0',
        archiveIterator: archiveIteratorWithChangelog('test', '3.0.0'),
      });

      await expect(promise).rejects.toThrow(PackageBreakingChangesNotAcknowledgedError);
      await expect(promise).rejects.toMatchObject({
        message: expect.stringContaining(
          '- 3.0.0: Removed the foo input. (https://github.com/elastic/integrations/pull/3)'
        ),
        attributes: {
          type: 'breaking_changes_not_acknowledged',
          breaking_changes: [
            expect.objectContaining({ version: '3.0.0' }),
            expect.objectContaining({ version: '2.0.0' }),
          ],
        },
      });
    });

    it('should not throw when the upgrade has no breaking changes', async () => {
      await expect(
        assertBreakingChangesAcknowledged({
          pkgName: 'test',
          fromVersion: '2.0.0',
          toVersion: '2.1.0',
          archiveIterator: archiveIteratorWithChangelog('test', '2.1.0'),
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('getPackagePoliciesUpgradeBreakingChanges', () => {
    beforeEach(() => {
      jest.mocked(getInstallation).mockResolvedValue({ version: '3.0.0' } as any);
      jest.mocked(getAsset).mockResolvedValue({ data_utf8: CHANGELOG } as any);
    });

    it('should return the policies whose upgrade to the installed version has breaking changes', async () => {
      const results = await getPackagePoliciesUpgradeBreakingChanges([
        packagePolicy('policy-1', 'test', '1.0.0'),
        packagePolicy('policy-2', 'test', '2.0.0'),
        packagePolicy('policy-3', 'test', '3.0.0'),
      ]);

      expect(
        results.map(({ packagePolicy: { id }, breakingChanges }) => [
          id,
          breakingChanges.map(({ version }) => version),
        ])
      ).toEqual([
        ['policy-1', ['3.0.0', '2.0.0']],
        ['policy-2', ['3.0.0']],
      ]);
      // The changelog is read once per package
      expect(getAsset).toHaveBeenCalledTimes(1);
    });

    it('should ignore packages that are not installed', async () => {
      jest.mocked(getInstallation).mockResolvedValue(undefined);

      const results = await getPackagePoliciesUpgradeBreakingChanges([
        packagePolicy('policy-1', 'test', '1.0.0'),
      ]);

      expect(results).toEqual([]);
      expect(getAsset).not.toHaveBeenCalled();
    });

    it('should not read the changelog when all policies are up to date', async () => {
      const results = await getPackagePoliciesUpgradeBreakingChanges([
        packagePolicy('policy-1', 'test', '3.0.0'),
      ]);

      expect(results).toEqual([]);
      expect(getAsset).not.toHaveBeenCalled();
    });
  });

  describe('assertPackagePoliciesUpgradeAcknowledged', () => {
    beforeEach(() => {
      jest.mocked(getInstallation).mockResolvedValue({ version: '3.0.0' } as any);
      jest.mocked(getAsset).mockResolvedValue({ data_utf8: CHANGELOG } as any);
    });

    it('should throw an error naming every policy with breaking changes', async () => {
      const promise = assertPackagePoliciesUpgradeAcknowledged([
        packagePolicy('policy-1', 'test', '1.0.0'),
        packagePolicy('policy-2', 'test', '2.0.0'),
      ]);

      await expect(promise).rejects.toThrow(PackageBreakingChangesNotAcknowledgedError);
      await expect(promise).rejects.toMatchObject({
        message: expect.stringMatching(/Package policy policy-1:[\s\S]*Package policy policy-2:/),
        attributes: {
          breaking_changes: [
            expect.objectContaining({ version: '3.0.0' }),
            expect.objectContaining({ version: '2.0.0' }),
          ],
        },
      });
    });

    it('should not throw when no policy upgrade has breaking changes', async () => {
      jest.mocked(getInstallation).mockResolvedValue({ version: '2.1.0' } as any);

      await expect(
        assertPackagePoliciesUpgradeAcknowledged([packagePolicy('policy-1', 'test', '2.0.0')])
      ).resolves.toBeUndefined();
      expect(getAsset).toHaveBeenCalledTimes(1);
    });
  });
});
