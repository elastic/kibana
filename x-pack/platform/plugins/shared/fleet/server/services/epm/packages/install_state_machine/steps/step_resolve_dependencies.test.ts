/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import { appContextService } from '../../../../app_context';

import { PackageDependencyError } from '../../../../../../common/errors';

import { getInstallation, getInstalledPackageSavedObjects } from '../../get';
import { installPackage } from '../../install';
import { removeInstallation } from '../../remove';
import { fetchList, pkgToPkgKey } from '../../../registry';
import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

import { stepResolveDependencies } from './step_resolve_dependencies';

jest.mock('../../../../app_context', () => {
  return {
    appContextService: {
      getExperimentalFeatures: jest.fn(),
      getLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
      }),
    },
  };
});
jest.mock('../../get');
jest.mock('../../install');
jest.mock('../../remove');
jest.mock('../../../registry');
jest.mock('../../utils');

// Use same path as step so we get the mock and can configure it

const mockGetExperimentalFeatures = jest.mocked(appContextService.getExperimentalFeatures);

const mockedGetInstallation = jest.mocked(getInstallation);
const mockedGetInstalledPackageSavedObjects = jest.mocked(getInstalledPackageSavedObjects);
const mockedInstallPackage = jest.mocked(installPackage);
const mockedRemoveInstallation = jest.mocked(removeInstallation);
const mockedFetchList = jest.mocked(fetchList);
const mockedWithPackageSpan = jest.mocked(withPackageSpan);
const mockedPkgToPkgKey = jest.mocked(pkgToPkgKey);

describe('stepResolveDependencies', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();

  const createContext = (overrides: Partial<InstallContext> = {}): InstallContext =>
    ({
      savedObjectsClient: soClient,
      esClient,
      logger,
      packageInstallContext: {
        packageInfo: {
          name: 'test-package',
          version: '1.0.0',
          requires: {
            content: [
              { package: 'dep-a', version: '^1.0.0' },
              { package: 'dep-b', version: '>=2.0.0' },
            ],
          },
        },
      },
      spaceId: 'default',
      installSource: 'registry',
      ...overrides,
    } as unknown as InstallContext);

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.clearAllMocks();

    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);
    mockedWithPackageSpan.mockImplementation((_name, fn) => fn());
    mockedPkgToPkgKey.mockImplementation(({ name, version }) => `${name}-${version}`);
  });

  it('returns early without running when enableResolveDependencies is not true', async () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: false,
    } as ReturnType<typeof mockGetExperimentalFeatures>);

    await stepResolveDependencies(
      createContext({
        packageInstallContext: {
          packageInfo: {
            name: 'pkg',
            version: '1.0.0',
            requires: { content: [{ package: 'dep', version: '1.0.0' }] },
          },
        },
      } as Partial<InstallContext>)
    );

    expect(mockedWithPackageSpan).not.toHaveBeenCalled();
    expect(mockedGetInstallation).not.toHaveBeenCalled();
  });

  it('does not run dependency check when skipDependencyCheck is true', async () => {
    mockedGetInstalledPackageSavedObjects.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 0,
      page: 1,
    });
    mockedGetInstallation.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    mockedFetchList
      .mockResolvedValueOnce([{ name: 'dep-a', version: '1.2.0' } as any])
      .mockResolvedValueOnce([{ name: 'dep-b', version: '2.0.0' } as any]);

    await stepResolveDependencies(createContext({ skipDependencyCheck: true }));

    expect(mockedGetInstalledPackageSavedObjects).not.toHaveBeenCalled();
    expect(mockedInstallPackage).toHaveBeenCalledTimes(2);
  });

  it('throws PackageDependencyError when dependant requires incompatible version', async () => {
    mockGetExperimentalFeatures.mockReturnValue({
      enableResolveDependencies: true,
    } as ReturnType<typeof mockGetExperimentalFeatures>);
    mockedGetInstalledPackageSavedObjects.mockResolvedValue({
      saved_objects: [
        {
          id: 'dependant-1',
          type: 'epm-packages',
          attributes: {
            name: 'dependant-pkg',
            version: '1.0.0',
            dependencies: [{ name: 'test-package', version: '^2.0.0' }],
          },
          references: [],
        } as any,
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });

    await expect(
      stepResolveDependencies(
        createContext({
          packageInstallContext: {
            packageInfo: {
              name: 'test-package',
              version: '1.0.0',
              requires: { content: [] },
            },
          } as any,
        } as Partial<InstallContext>)
      )
    ).rejects.toThrow(PackageDependencyError);

    expect(mockedGetInstalledPackageSavedObjects).toHaveBeenCalledWith(
      soClient,
      expect.objectContaining({ dependencyPackageName: 'test-package' })
    );
  });

  it('installs dependency when not installed (to_install)', async () => {
    mockedGetInstalledPackageSavedObjects.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 0,
      page: 1,
    });
    mockedGetInstallation.mockResolvedValue(undefined);
    mockedFetchList.mockResolvedValue([{ name: 'dep-a', version: '1.2.0' } as any]);

    await stepResolveDependencies(
      createContext({
        packageInstallContext: {
          packageInfo: {
            name: 'parent',
            version: '1.0.0',
            requires: {
              content: [{ package: 'dep-a', version: '^1.0.0' }],
            },
          },
        },
      } as Partial<InstallContext>)
    );

    expect(mockedInstallPackage).toHaveBeenCalledTimes(1);
    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        pkgkey: 'dep-a-1.2.0',
        spaceId: 'default',
      })
    );
  });

  it('updates dependency when installed version does not satisfy constraint (to_update)', async () => {
    const emptySavedObjects = {
      saved_objects: [],
      total: 0,
      per_page: 0,
      page: 1,
    };
    mockedGetInstalledPackageSavedObjects
      .mockResolvedValueOnce(emptySavedObjects)
      .mockResolvedValueOnce(emptySavedObjects);
    mockedGetInstallation.mockResolvedValueOnce({
      name: 'dep-a',
      version: '1.0.0',
    } as any);
    mockedFetchList.mockResolvedValue([
      { name: 'dep-a', version: '1.5.0' } as any,
      { name: 'dep-a', version: '1.0.0' } as any,
    ]);

    await stepResolveDependencies(
      createContext({
        packageInstallContext: {
          packageInfo: {
            name: 'parent',
            version: '1.0.0',
            requires: {
              content: [{ package: 'dep-a', version: '^1.2.0' }],
            },
          },
        },
      } as Partial<InstallContext>)
    );

    expect(mockedInstallPackage).toHaveBeenCalledTimes(1);
    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        pkgkey: 'dep-a-1.5.0',
      })
    );
  });

  it('skips installing when dependency is already installed with satisfying version', async () => {
    mockedGetInstalledPackageSavedObjects.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 0,
      page: 1,
    });
    mockedGetInstallation
      .mockResolvedValueOnce({
        name: 'dep-a',
        version: '1.2.0',
      } as any)
      .mockResolvedValueOnce({
        name: 'dep-b',
        version: '2.1.0',
      } as any);

    await stepResolveDependencies(createContext());

    expect(mockedInstallPackage).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('dependency dep-a@1.2.0 is already installed')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('dependency dep-b@2.1.0 is already installed')
    );
  });

  it('does not call getDependants when force is true', async () => {
    mockedGetInstallation.mockResolvedValue(undefined);
    mockedFetchList
      .mockResolvedValueOnce([{ name: 'dep-a', version: '1.0.0' } as any])
      .mockResolvedValueOnce([{ name: 'dep-b', version: '2.0.0' } as any]);

    await stepResolveDependencies(createContext({ force: true }));

    expect(mockedGetInstalledPackageSavedObjects).not.toHaveBeenCalled();
    expect(mockedInstallPackage).toHaveBeenCalledTimes(2);
  });

  it('returns without installing when package has no requires.content', async () => {
    await stepResolveDependencies(
      createContext({
        packageInstallContext: {
          packageInfo: {
            name: 'no-deps',
            version: '1.0.0',
          },
        },
      } as Partial<InstallContext>)
    );

    expect(mockedGetInstallation).not.toHaveBeenCalled();
    expect(mockedInstallPackage).not.toHaveBeenCalled();
  });

  it('throws PackageDependencyError when downgrade would be required', async () => {
    const emptySavedObjects = {
      saved_objects: [],
      total: 0,
      per_page: 0,
      page: 1,
    };
    mockedGetInstalledPackageSavedObjects
      .mockResolvedValueOnce(emptySavedObjects)
      .mockResolvedValueOnce(emptySavedObjects);
    mockedGetInstallation.mockResolvedValueOnce({
      name: 'dep-a',
      version: '2.0.0',
    } as any);
    mockedFetchList.mockResolvedValue([
      { name: 'dep-a', version: '1.0.0' } as any,
      { name: 'dep-a', version: '1.5.0' } as any,
    ]);

    await expect(
      stepResolveDependencies(
        createContext({
          packageInstallContext: {
            packageInfo: {
              name: 'parent',
              version: '1.0.0',
              requires: {
                content: [{ package: 'dep-a', version: '^1.0.0' }],
              },
            },
          },
        } as Partial<InstallContext>)
      )
    ).rejects.toThrow(PackageDependencyError);

    expect(mockedInstallPackage).not.toHaveBeenCalled();
  });

  describe('rollback on dependency install failure', () => {
    it('rolls back first dependency (to_install) when second dependency install fails', async () => {
      mockedGetInstalledPackageSavedObjects.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      });
      mockedGetInstallation.mockResolvedValue(undefined);
      mockedFetchList
        .mockResolvedValueOnce([{ name: 'dep-a', version: '1.2.0' } as any])
        .mockResolvedValueOnce([{ name: 'dep-b', version: '2.0.0' } as any]);
      mockedInstallPackage
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error('Install dep-b failed'));

      await expect(stepResolveDependencies(createContext())).rejects.toThrow(
        'Install dep-b failed'
      );

      expect(mockedInstallPackage).toHaveBeenCalledTimes(2);
      expect(mockedRemoveInstallation).toHaveBeenCalledTimes(1);
      expect(mockedRemoveInstallation).toHaveBeenCalledWith(
        expect.objectContaining({
          savedObjectsClient: soClient,
          pkgName: 'dep-a',
          pkgVersion: '1.2.0',
          esClient,
          force: true,
          installSource: 'registry',
        })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('rolling back 1 dependency install(s)/update(s) after failure')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('rolled back install of dep-a@1.2.0')
      );
    });

    it('does not call removeInstallation when first dependency install fails', async () => {
      mockedGetInstalledPackageSavedObjects.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      });
      mockedGetInstallation.mockResolvedValue(undefined);
      mockedFetchList.mockResolvedValue([{ name: 'dep-a', version: '1.2.0' } as any]);
      mockedInstallPackage.mockRejectedValueOnce(new Error('Install dep-a failed'));

      await expect(
        stepResolveDependencies(
          createContext({
            packageInstallContext: {
              packageInfo: {
                name: 'test-package',
                version: '1.0.0',
                requires: { content: [{ package: 'dep-a', version: '^1.0.0' }] },
              },
            } as any,
          })
        )
      ).rejects.toThrow('Install dep-a failed');

      expect(mockedInstallPackage).toHaveBeenCalledTimes(1);
      expect(mockedRemoveInstallation).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('rolls back to_update by re-installing previous version when later dependency fails', async () => {
      const emptySavedObjects = {
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      };
      mockedGetInstalledPackageSavedObjects
        .mockResolvedValueOnce(emptySavedObjects)
        .mockResolvedValueOnce(emptySavedObjects);
      mockedGetInstallation
        .mockResolvedValueOnce({ name: 'dep-a', version: '1.0.0' } as any)
        .mockResolvedValueOnce(undefined);
      mockedFetchList
        .mockResolvedValueOnce([
          { name: 'dep-a', version: '1.5.0' } as any,
          { name: 'dep-a', version: '1.0.0' } as any,
        ])
        .mockResolvedValueOnce([{ name: 'dep-b', version: '2.0.0' } as any]);
      mockedInstallPackage
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error('Install dep-b failed'));

      await expect(
        stepResolveDependencies(
          createContext({
            packageInstallContext: {
              packageInfo: {
                name: 'parent',
                version: '1.0.0',
                requires: {
                  content: [
                    { package: 'dep-a', version: '^1.2.0' },
                    { package: 'dep-b', version: '>=2.0.0' },
                  ],
                },
              },
            } as any,
          })
        )
      ).rejects.toThrow('Install dep-b failed');

      expect(mockedInstallPackage).toHaveBeenCalledTimes(3);
      expect(mockedInstallPackage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ pkgkey: 'dep-a-1.5.0' })
      );
      expect(mockedInstallPackage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ pkgkey: 'dep-b-2.0.0' })
      );
      expect(mockedInstallPackage).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          pkgkey: 'dep-a-1.0.0',
          force: true,
        })
      );
      expect(mockedRemoveInstallation).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('rolled back update of dep-a to 1.0.0')
      );
    });
  });
});
