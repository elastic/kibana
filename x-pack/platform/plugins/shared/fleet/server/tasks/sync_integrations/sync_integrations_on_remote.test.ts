/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackageNotFoundError } from '../../errors';
import { outputService } from '../../services';

import { createOrUpdateFailedInstallStatus } from '../../services/epm/packages/install_errors_helpers';

import { installCustomAsset } from './custom_assets';

import { syncIntegrationsOnRemote } from './sync_integrations_on_remote';

jest.mock('../../services');
jest.mock('./custom_assets');
jest.mock('../../services/epm/packages/install_errors_helpers');

const outputServiceMock = outputService as jest.Mocked<typeof outputService>;
const createOrUpdateFailedInstallStatusMock = createOrUpdateFailedInstallStatus as jest.Mocked<
  typeof createOrUpdateFailedInstallStatus
>;

describe('syncIntegrationsOnRemote', () => {
  const abortController = new AbortController();
  let esClientMock: any;
  let getIndicesMock: jest.Mock;
  let searchMock: jest.Mock;
  let packageClientMock: any;
  let loggerMock: any;
  let soClientMock: any;

  beforeEach(() => {
    getIndicesMock = jest.fn();
    searchMock = jest.fn();
    esClientMock = {
      indices: {
        get: getIndicesMock,
      },
      search: searchMock,
    };
    outputServiceMock.list.mockResolvedValue({
      items: [
        {
          type: 'elasticsearch',
          hosts: ['http://localhost:9200'],
        },
      ],
    } as any);
    packageClientMock = {
      getInstallation: jest.fn(),
      installPackage: jest.fn(),
    };
    loggerMock = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    (installCustomAsset as jest.Mock).mockClear();
    soClientMock = {
      update: jest.fn(),
    };
  });

  it('should throw error if multiple synced integrations ccr indices exist', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
      'fleet-synced-integrations-ccr-remote2': {},
    });

    await expect(
      syncIntegrationsOnRemote(esClientMock, soClientMock, {} as any, abortController, loggerMock)
    ).rejects.toThrowError(
      'Not supported to sync multiple indices with prefix fleet-synced-integrations-ccr-*'
    );
  });

  function getSyncedIntegrationsCCRDoc(syncEnabled: boolean) {
    return {
      hits: {
        hits: [
          {
            _source: {
              remote_es_hosts: [
                {
                  hosts: ['http://localhost:9200'],
                  sync_integrations: syncEnabled,
                },
              ],
              integrations: [
                {
                  package_name: 'nginx',
                  package_version: '2.2.0',
                  updated_at: '2021-01-01T00:00:00.000Z',
                  install_source: 'registry',
                },
                {
                  package_name: 'system',
                  package_version: '2.2.0',
                  updated_at: '2021-01-01T00:00:00.000Z',
                  install_source: 'registry',
                },
                {
                  package_name: 'custom-pkg',
                  package_version: '1.0.0',
                  updated_at: '2021-01-01T00:00:00.000Z',
                  install_source: 'custom',
                },
              ],
              custom_assets: {
                'component_template:logs-system.auth@custom': {
                  is_deleted: false,
                  name: 'logs-system.auth@custom',
                  package_name: 'system',
                  package_version: '0.1.0',
                  template: {},
                  type: 'component_template',
                },
                'ingest_pipeline:logs-system.auth@custom': {
                  is_deleted: false,
                  name: 'logs-system.auth@custom',
                  package_name: 'system',
                  package_version: '0.1.0',
                  pipeline: {},
                  type: 'ingest_pipeline',
                },
              },
            },
          },
        ],
      },
    };
  }

  it('should do nothing if no matching remote output has sync enabled', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(false));

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.getInstallation).not.toHaveBeenCalled();
  });

  it('should do nothing if sync enabled and packages are installed', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation((packageName: string) =>
      packageName === 'nginx'
        ? {
            install_status: 'installed',
            version: '2.2.0',
          }
        : {
            install_status: 'installed',
            version: '2.3.0',
          }
    );

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).not.toHaveBeenCalled();
  });

  it('should install package if lower version is installed', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation((packageName: string) =>
      packageName === 'nginx'
        ? {
            install_status: 'installed',
            version: '2.1.0',
          }
        : {
            install_status: 'installed',
            version: '2.2.0',
          }
    );
    packageClientMock.installPackage.mockResolvedValue({
      status: 'installed',
    });

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).toHaveBeenCalledWith({
      pkgName: 'nginx',
      pkgVersion: '2.2.0',
      keepFailedInstallation: true,
      force: true,
    });
  });

  it('should keep installing all packages when one throws error', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation((packageName: string) =>
      packageName === 'nginx'
        ? {
            install_status: 'installed',
            version: '2.1.0',
          }
        : {
            install_status: 'installed',
            version: '2.0.0',
          }
    );
    packageClientMock.installPackage.mockImplementation(({ pkgName }: any) => {
      if (pkgName === 'nginx') {
        throw new Error('failed to install');
      } else {
        return {
          status: 'installed',
        };
      }
    });

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).toHaveBeenCalledTimes(2);
  });

  it('should try to install latest package on PackageNotFoundError', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation((packageName: string) =>
      packageName === 'nginx'
        ? undefined
        : {
            install_status: 'installed',
            version: '2.2.0',
          }
    );
    packageClientMock.installPackage.mockImplementation(({ pkgName, pkgVersion }: any) => {
      if (pkgVersion === '2.2.0') {
        return {
          error: new PackageNotFoundError('not found'),
        };
      }
      return {
        status: 'installed',
      };
    });

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).toHaveBeenCalledTimes(2);
  });
  it('should call createOrUpdateFailedInstallStatus if installation failed', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation((packageName: string) =>
      packageName === 'custom-pkg'
        ? undefined
        : {
            install_status: 'installed',
            version: '2.2.0',
          }
    );
    packageClientMock.installPackage.mockImplementation(({ pkgName, pkgVersion }: any) => {
      if (pkgName === 'custom-pkg') {
        throw new PackageNotFoundError('package not found in registry');
      }
      return {
        status: 'installed',
      };
    });

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).toHaveBeenCalledTimes(1);
    expect(createOrUpdateFailedInstallStatusMock).toHaveBeenCalledWith({
      error: new PackageNotFoundError('package not found in registry'),
      installSource: 'custom',
      pkgName: 'custom-pkg',
      pkgVersion: '1.0.0',
      logger: expect.anything(),
      savedObjectsClient: expect.anything(),
    });
  });

  it('should do nothing if sync enabled and the package is installing', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation((packageName: string) =>
      packageName === 'nginx'
        ? {
            install_status: 'installing',
            version: '2.1.0',
          }
        : {
            install_status: 'installed',
            version: '2.3.0',
          }
    );

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).not.toHaveBeenCalled();
  });

  it('should install custom assets', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
    searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
    packageClientMock.getInstallation.mockImplementation(() => ({
      install_status: 'installed',
      version: '2.2.0',
    }));
    packageClientMock.installPackage.mockResolvedValue({
      status: 'installed',
    });

    await syncIntegrationsOnRemote(
      esClientMock,
      soClientMock,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(installCustomAsset).toHaveBeenCalledTimes(2);
  });

  describe('Retry logic', () => {
    it('should not retry if max retry attempts reached', async () => {
      getIndicesMock.mockResolvedValue({
        'fleet-synced-integrations-ccr-remote1': {},
      });
      searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
      packageClientMock.getInstallation.mockImplementation((packageName: string) =>
        packageName === 'nginx'
          ? {
              install_status: 'install_failed',
              version: '2.1.0',
              latest_install_failed_attempts: [
                {
                  created_at: new Date().toISOString(),
                },
                {
                  created_at: '2025-01-28T08:11:44.395Z',
                },
                {
                  created_at: '2025-01-27T08:11:44.395Z',
                },
                {
                  created_at: '2025-01-26T08:11:44.395Z',
                },
                {
                  created_at: '2025-01-25T08:11:44.395Z',
                },
              ],
            }
          : {
              install_status: 'installed',
              version: '2.2.0',
            }
      );
      packageClientMock.installPackage.mockResolvedValue({
        status: 'installed',
      });

      await syncIntegrationsOnRemote(
        esClientMock,
        soClientMock,
        packageClientMock,
        abortController,
        loggerMock
      );

      expect(packageClientMock.installPackage).not.toHaveBeenCalled();
    });

    it('should not retry if retry time not passed', async () => {
      getIndicesMock.mockResolvedValue({
        'fleet-synced-integrations-ccr-remote1': {},
      });
      searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
      packageClientMock.getInstallation.mockImplementation((packageName: string) =>
        packageName === 'nginx'
          ? {
              install_status: 'install_failed',
              version: '2.1.0',
              latest_install_failed_attempts: [
                {
                  created_at: new Date().toISOString(),
                },
                {
                  created_at: '2025-01-28T08:11:44.395Z',
                },
                {
                  created_at: '2025-01-27T08:11:44.395Z',
                },
                {
                  created_at: '2025-01-26T08:11:44.395Z',
                },
              ],
            }
          : {
              install_status: 'installed',
              version: '2.2.0',
            }
      );
      packageClientMock.installPackage.mockResolvedValue({
        status: 'installed',
      });

      await syncIntegrationsOnRemote(
        esClientMock,
        soClientMock,
        packageClientMock,
        abortController,
        loggerMock
      );

      expect(packageClientMock.installPackage).not.toHaveBeenCalled();
    });

    it('should retry if retry time passed', async () => {
      getIndicesMock.mockResolvedValue({
        'fleet-synced-integrations-ccr-remote1': {},
      });
      searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
      packageClientMock.getInstallation.mockImplementation((packageName: string) =>
        packageName === 'nginx'
          ? {
              install_status: 'install_failed',
              version: '2.1.0',
              latest_install_failed_attempts: [
                {
                  created_at: '2025-02-28T04:11:44.395Z',
                },
              ],
            }
          : {
              install_status: 'installed',
              version: '2.2.0',
            }
      );
      packageClientMock.installPackage.mockResolvedValue({
        status: 'installed',
      });

      await syncIntegrationsOnRemote(
        esClientMock,
        soClientMock,
        packageClientMock,
        abortController,
        loggerMock
      );

      expect(packageClientMock.installPackage).toHaveBeenCalled();
    });

    it('should not retry if package has install_source custom even if retry time has passed', async () => {
      getIndicesMock.mockResolvedValue({
        'fleet-synced-integrations-ccr-remote1': {},
      });
      searchMock.mockResolvedValue(getSyncedIntegrationsCCRDoc(true));
      packageClientMock.getInstallation.mockImplementation((packageName: string) =>
        packageName === 'custom'
          ? {
              install_status: 'install_failed',
              version: '2.1.0',
              latest_install_failed_attempts: [
                {
                  created_at: '2025-02-28T04:11:44.395Z',
                },
              ],
            }
          : {
              install_status: 'installed',
              version: '2.2.0',
            }
      );
      packageClientMock.installPackage.mockResolvedValue({
        status: 'installed',
      });

      await syncIntegrationsOnRemote(
        esClientMock,
        soClientMock,
        packageClientMock,
        abortController,
        loggerMock
      );

      expect(packageClientMock.installPackage).not.toHaveBeenCalled();
    });
  });
});
