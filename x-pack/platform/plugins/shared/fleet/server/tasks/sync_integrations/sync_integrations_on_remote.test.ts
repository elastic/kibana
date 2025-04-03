/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { PackageNotFoundError } from '../../errors';
import { outputService } from '../../services';

import { getPackageSavedObjects } from '../../services/epm/packages/get';

import { installCustomAsset, getPipeline, getComponentTemplate } from './custom_assets';
import {
  syncIntegrationsOnRemote,
  getFollowerIndexInfo,
  fetchAndCompareSyncedIntegrations,
} from './sync_integrations_on_remote';

jest.mock('../../services');
jest.mock('./custom_assets', () => {
  return { getPipeline: jest.fn(), getComponentTemplate: jest.fn(), installCustomAsset: jest.fn() };
});
jest.mock('../../services/epm/packages/get', () => {
  return {
    ...jest.requireActual('../../services/epm/packages/get'),
    getPackageSavedObjects: jest.fn(),
  };
});

const outputServiceMock = outputService as jest.Mocked<typeof outputService>;
const getPipelineMock = getPipeline as jest.Mocked<typeof getPipeline>;
const getComponentTemplateMock = getComponentTemplate as jest.Mocked<typeof getComponentTemplate>;

describe('syncIntegrationsOnRemote', () => {
  const abortController = new AbortController();
  let esClientMock: any;
  let getIndicesMock: jest.Mock;
  let searchMock: jest.Mock;
  let packageClientMock: any;
  let loggerMock: any;

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
  });

  it('should throw error if multiple synced integrations ccr indices exist', async () => {
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
      'fleet-synced-integrations-ccr-remote2': {},
    });

    await expect(
      syncIntegrationsOnRemote(esClientMock, {} as any, {} as any, abortController, loggerMock)
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
                },
                {
                  package_name: 'system',
                  package_version: '2.2.0',
                  updated_at: '2021-01-01T00:00:00.000Z',
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
      {} as any,
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
      {} as any,
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
      {} as any,
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
      {} as any,
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
      {} as any,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).toHaveBeenCalledTimes(2);
  });

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
      {} as any,
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
      {} as any,
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
      {} as any,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(packageClientMock.installPackage).toHaveBeenCalled();
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
      {} as any,
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
      {} as any,
      packageClientMock,
      abortController,
      loggerMock
    );

    expect(installCustomAsset).toHaveBeenCalledTimes(2);
  });
});

describe('getFollowerIndexInfo', () => {
  let esClientMock: any;
  let getIndicesMock: jest.Mock;
  let searchMock: jest.Mock;
  let loggerMock: any;

  beforeEach(() => {
    getIndicesMock = jest.fn();
    searchMock = jest.fn();
    esClientMock = {
      indices: {
        get: getIndicesMock,
      },
      search: searchMock,
      ccr: { followInfo: jest.fn() },
    };

    loggerMock = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    (installCustomAsset as jest.Mock).mockClear();
    getIndicesMock.mockResolvedValue({
      'fleet-synced-integrations-ccr-remote1': {},
    });
  });

  it('should return error if follower index is not available', async () => {
    expect(await getFollowerIndexInfo(esClientMock, loggerMock)).toEqual({
      error: 'Follower index fleet-synced-integrations-ccr-remote1 not available',
    });
  });

  it('should return error if follower index returns empty array', async () => {
    esClientMock.ccr.followInfo.mockResolvedValue({
      follower_indices: [],
    } as any);

    expect(await getFollowerIndexInfo(esClientMock, loggerMock)).toEqual({
      error: 'Follower index fleet-synced-integrations-ccr-remote1 not available',
    });
  });

  it('should return info about follower index', async () => {
    esClientMock.ccr.followInfo.mockResolvedValue({
      follower_indices: [
        {
          follower_index: 'fleet-synced-integrations-ccr-remote1',
          remote_cluster: 'Main',
          leader_index: 'fleet-synced-integrations',
          status: 'active',
          parameters: {
            max_read_request_operation_count: 5120,
            max_write_request_operation_count: 5120,
            max_outstanding_read_requests: 12,
            max_outstanding_write_requests: 9,
            max_read_request_size: '32mb',
            max_write_request_size: '9223372036854775807b',
            max_write_buffer_count: 2147483647,
            max_write_buffer_size: '512mb',
            max_retry_delay: '500ms',
            read_poll_timeout: '1m',
          },
        },
      ],
    } as any);
    const info = await getFollowerIndexInfo(esClientMock, loggerMock);
    expect(info).toEqual({
      info: {
        follower_index: 'fleet-synced-integrations-ccr-remote1',
        remote_cluster: 'Main',
        leader_index: 'fleet-synced-integrations',
        status: 'active',
        parameters: {
          max_read_request_operation_count: 5120,
          max_write_request_operation_count: 5120,
          max_outstanding_read_requests: 12,
          max_outstanding_write_requests: 9,
          max_read_request_size: '32mb',
          max_write_request_size: '9223372036854775807b',
          max_write_buffer_count: 2147483647,
          max_write_buffer_size: '512mb',
          max_retry_delay: '500ms',
          read_poll_timeout: '1m',
        },
      },
    });
  });

  it('should return error if follower is paused', async () => {
    esClientMock.ccr.followInfo.mockResolvedValue({
      follower_indices: [
        {
          follower_index: 'fleet-synced-integrations-ccr-remote1',
          remote_cluster: 'Main',
          leader_index: 'fleet-synced-integrations',
          status: 'paused',
          parameters: {},
        },
      ],
    } as any);
    const info = await getFollowerIndexInfo(esClientMock, loggerMock);
    expect(info).toEqual({
      error: 'Follower index fleet-synced-integrations-ccr-remote1 paused',
    });
  });
});

describe('fetchAndCompareSyncedIntegrations', () => {
  let esClientMock: any;
  let getIndicesMock: jest.Mock;
  let searchMock: jest.Mock;
  const soClientMock = savedObjectsClientMock.create();

  let loggerMock: any;

  beforeEach(() => {
    getIndicesMock = jest.fn();
    searchMock = jest.fn();
    esClientMock = {
      indices: {
        get: getIndicesMock,
      },
      search: searchMock,
    };

    loggerMock = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    (installCustomAsset as jest.Mock).mockClear();
  });

  it('should return error if no integrations are found', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [],
      },
    } as any);
    const res = await fetchAndCompareSyncedIntegrations(
      esClientMock,
      soClientMock,
      'fleet-synced-integrations-ccr-*',
      loggerMock
    );
    expect(res).toEqual({
      error: 'No integrations found on fleet-synced-integrations-ccr-*',
      integrations: [],
    });
  });

  it('should return error if there are integrations on sync index but none are installed', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              integrations: [
                {
                  package_name: 'elastic_agent',
                  package_version: '2.2.0',
                  updated_at: '2025-03-20T14:18:40.076Z',
                },
                {
                  package_name: 'system',
                  package_version: '1.67.3',
                  updated_at: '2025-03-20T14:18:40.111Z',
                },
              ],
            },
          },
        ],
      },
    } as any);
    const res = await fetchAndCompareSyncedIntegrations(
      esClientMock,
      soClientMock,
      'fleet-synced-integrations-ccr-*',
      loggerMock
    );
    expect(res).toEqual({
      error: 'No integrations installed on remote',
      integrations: [],
    });
  });
  it('should compare integrations installed on remote with the ones on sync index', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              integrations: [
                {
                  package_name: 'elastic_agent',
                  package_version: '2.2.0',
                  updated_at: '2025-03-20T14:18:40.076Z',
                },
                {
                  package_name: 'system',
                  package_version: '1.67.3',
                  updated_at: '2025-03-20T14:18:40.111Z',
                },
              ],
            },
          },
        ],
      },
    } as any);
    (getPackageSavedObjects as jest.MockedFunction<any>).mockReturnValue({
      page: 1,
      per_page: 10000,
      total: 1,
      saved_objects: [
        {
          type: 'epm-packages',
          id: 'elastic_agent',
          attributes: {
            version: '2.2.0',
            install_status: 'installed',
          },

          updated_at: '2025-03-26T14:06:27.611Z',
        },
        {
          type: 'epm-packages',
          id: 'system',
          attributes: {
            version: '1.67.3',
            install_status: 'installed',
          },

          updated_at: '2025-03-26T14:06:27.611Z',
        },
      ],
    });
    const res = await fetchAndCompareSyncedIntegrations(
      esClientMock,
      soClientMock,
      'fleet-synced-integrations-ccr-*',
      loggerMock
    );
    expect(res).toEqual({
      integrations: [
        {
          package_name: 'elastic_agent',
          package_version: '2.2.0',
          sync_status: 'completed',
          updated_at: expect.any(String),
        },
        {
          package_name: 'system',
          package_version: '1.67.3',
          sync_status: 'completed',
          updated_at: expect.any(String),
        },
      ],
    });
  });

  it('should return errors for single integrations to cover for different cases', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              integrations: [
                {
                  package_name: 'elastic_agent',
                  package_version: '2.2.0',
                  updated_at: '2025-03-20T14:18:40.076Z',
                },
                {
                  package_name: 'system',
                  package_version: '1.67.3',
                  updated_at: '2025-03-20T14:18:40.111Z',
                },
                {
                  package_name: 'synthetics',
                  package_version: '1.4.1',
                  updated_at: '2025-03-17T15:21:14.092Z',
                },
              ],
            },
          },
        ],
      },
    } as any);
    (getPackageSavedObjects as jest.MockedFunction<any>).mockReturnValue({
      page: 1,
      per_page: 10000,
      total: 2,
      saved_objects: [
        {
          type: 'epm-packages',
          id: 'system',
          attributes: {
            version: '1.67.2',
            install_status: 'installed',
          },
          updated_at: '2025-03-26T14:06:27.611Z',
        },
        {
          type: 'epm-packages',
          id: 'synthetics',
          attributes: {
            version: '1.4.1',
            install_status: 'not_installed',
          },
          updated_at: '2025-03-26T14:06:27.611Z',
        },
      ],
    });
    const res = await fetchAndCompareSyncedIntegrations(
      esClientMock,
      soClientMock,
      'fleet-synced-integrations-ccr-*',
      loggerMock
    );
    expect(res).toEqual({
      integrations: [
        {
          error: 'Installation not found on remote',
          package_name: 'elastic_agent',
          package_version: '2.2.0',
          sync_status: 'failed',
          updated_at: expect.any(String),
        },
        {
          package_name: 'system',
          package_version: '1.67.3',
          sync_status: 'failed',
          updated_at: expect.any(String),
          error: 'Found incorrect installed version 1.67.2',
        },
        {
          error: 'Installation status: not_installed',
          package_name: 'synthetics',
          package_version: '1.4.1',
          sync_status: 'failed',
          updated_at: expect.any(String),
        },
      ],
    });
  });

  describe('compare custom integrations', () => {
    let searchMockWithCustomAssets: any;

    afterEach(() => {
      jest.resetAllMocks();
    });
    beforeEach(() => {
      searchMockWithCustomAssets = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                integrations: [
                  {
                    package_name: 'system',
                    package_version: '1.67.3',
                    updated_at: '2025-03-20T14:18:40.076Z',
                  },
                ],
                custom_assets: {
                  'component_template:logs-system.auth@custom': {
                    type: 'component_template',
                    name: 'logs-system.auth@custom',
                    package_name: 'system',
                    package_version: '1.67.3',
                    is_deleted: false,
                    template: {
                      mappings: {
                        dynamic_templates: [],
                        properties: {
                          'Test-mapping': {
                            type: 'text',
                          },
                        },
                      },
                    },
                  },
                  'ingest_pipeline:logs-system.auth@custom': {
                    type: 'ingest_pipeline',
                    name: 'logs-system.auth@custom',
                    package_name: 'system',
                    package_version: '1.67.3',
                    is_deleted: false,
                    pipeline: {
                      processors: [
                        {
                          set: {
                            field: 'test',
                            value: 'test-value',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      });
    });

    it('should return synchronizing state if the assets are different', async () => {
      (getPipelineMock as jest.MockedFunction<any>).mockResolvedValue({
        'logs-system.auth@custom': {
          processors: [
            {
              user_agent: {
                field: 'user_agent',
              },
            },
          ],
        },
      });
      (getComponentTemplateMock as jest.MockedFunction<any>).mockResolvedValue({
        component_templates: [
          {
            name: 'logs-system.auth@custom',
            component_template: {
              template: {
                mappings: {
                  properties: {
                    new_field: {
                      type: 'text',
                    },
                  },
                },
              },
            },
          },
        ],
      });

      esClientMock = {
        search: searchMockWithCustomAssets,
      };
      (getPackageSavedObjects as jest.MockedFunction<any>).mockReturnValue({
        page: 1,
        per_page: 10000,
        total: 1,
        saved_objects: [
          {
            type: 'epm-packages',
            id: 'system',
            attributes: {
              version: '1.67.3',
              install_status: 'installed',
            },
            updated_at: '2025-03-26T14:06:27.611Z',
          },
        ],
      });

      const res = await fetchAndCompareSyncedIntegrations(
        esClientMock,
        soClientMock,
        'fleet-synced-integrations-ccr-*',
        loggerMock
      );

      expect(res).toEqual({
        integrations: [
          {
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'completed',
            updated_at: expect.any(String),
          },
        ],
        custom_assets: {
          'component_template:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'synchronizing',
            template: {
              mappings: {
                dynamic_templates: [],
                properties: {
                  'Test-mapping': {
                    type: 'text',
                  },
                },
              },
            },
            type: 'component_template',
          },
          'ingest_pipeline:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '1.67.3',
            pipeline: {
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'test-value',
                  },
                },
              ],
            },
            sync_status: 'synchronizing',
            type: 'ingest_pipeline',
          },
        },
      });
    });

    it('should return completed if custom assets are equal', async () => {
      (getPipelineMock as jest.MockedFunction<any>).mockResolvedValue({
        'logs-system.auth@custom': {
          processors: [
            {
              set: {
                field: 'test',
                value: 'test-value',
              },
            },
          ],
        },
      });
      (getComponentTemplateMock as jest.MockedFunction<any>).mockResolvedValue({
        component_templates: [
          {
            name: 'logs-system.auth@custom',
            component_template: {
              template: {
                mappings: {
                  dynamic_templates: [],
                  properties: {
                    'Test-mapping': {
                      type: 'text',
                    },
                  },
                },
              },
            },
          },
        ],
      });

      esClientMock = {
        search: searchMockWithCustomAssets,
      };
      (getPackageSavedObjects as jest.MockedFunction<any>).mockReturnValue({
        page: 1,
        per_page: 10000,
        total: 1,
        saved_objects: [
          {
            type: 'epm-packages',
            id: 'system',
            attributes: {
              version: '1.67.3',
              install_status: 'installed',
            },
            updated_at: '2025-03-26T14:06:27.611Z',
          },
        ],
      });

      const res = await fetchAndCompareSyncedIntegrations(
        esClientMock,
        soClientMock,
        'fleet-synced-integrations-ccr-*',
        loggerMock
      );

      expect(res).toEqual({
        integrations: [
          {
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'completed',
            updated_at: expect.any(String),
          },
        ],
        custom_assets: {
          'component_template:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'completed',
            template: {
              mappings: {
                dynamic_templates: [],
                properties: {
                  'Test-mapping': {
                    type: 'text',
                  },
                },
              },
            },
            type: 'component_template',
          },
          'ingest_pipeline:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '1.67.3',
            pipeline: {
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'test-value',
                  },
                },
              ],
            },
            sync_status: 'completed',
            type: 'ingest_pipeline',
          },
        },
      });
    });

    it('should return synchronizing status if no custom assets are found installed', async () => {
      esClientMock = {
        search: searchMockWithCustomAssets,
      };
      (getPackageSavedObjects as jest.MockedFunction<any>).mockReturnValue({
        page: 1,
        per_page: 10000,
        total: 1,
        saved_objects: [
          {
            type: 'epm-packages',
            id: 'system',
            attributes: {
              version: '1.67.3',
              install_status: 'installed',
            },
            updated_at: '2025-03-26T14:06:27.611Z',
          },
        ],
      });

      const res = await fetchAndCompareSyncedIntegrations(
        esClientMock,
        soClientMock,
        'fleet-synced-integrations-ccr-*',
        loggerMock
      );
      expect(res).toEqual({
        custom_assets: {
          'component_template:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'synchronizing',
            template: {
              mappings: {
                dynamic_templates: [],
                properties: {
                  'Test-mapping': {
                    type: 'text',
                  },
                },
              },
            },
            type: 'component_template',
          },
          'ingest_pipeline:logs-system.auth@custom': {
            is_deleted: false,
            name: 'logs-system.auth@custom',
            package_name: 'system',
            package_version: '1.67.3',
            pipeline: {
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'test-value',
                  },
                },
              ],
            },
            sync_status: 'synchronizing',
            type: 'ingest_pipeline',
          },
        },
        integrations: [
          {
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'completed',
            updated_at: expect.any(String),
          },
        ],
      });
    });
    it('should return error in the top level if there is any error in the function', async () => {
      esClientMock = {
        search: jest.fn().mockRejectedValueOnce(new Error('Some es error')),
      };

      const res = await fetchAndCompareSyncedIntegrations(
        esClientMock,
        soClientMock,
        'fleet-synced-integrations-ccr-*',
        loggerMock
      );
      expect(res).toEqual({
        error: 'Some es error',
        integrations: [],
      });
    });

    it('should return error when custom assets throws error', async () => {
      (getPipelineMock as jest.MockedFunction<any>).mockRejectedValueOnce(
        new Error('Error in getPipeline')
      );
      (getComponentTemplateMock as jest.MockedFunction<any>).mockResolvedValue({
        component_templates: [
          {
            name: 'logs-system.auth@custom',
            component_template: {
              template: {
                mappings: {
                  dynamic_templates: [],
                  properties: {
                    'Test-mapping': {
                      type: 'text',
                    },
                  },
                },
              },
            },
          },
        ],
      });

      esClientMock = {
        search: searchMockWithCustomAssets,
      };
      (getPackageSavedObjects as jest.MockedFunction<any>).mockReturnValue({
        page: 1,
        per_page: 10000,
        total: 1,
        saved_objects: [
          {
            type: 'epm-packages',
            id: 'system',
            attributes: {
              version: '1.67.3',
              install_status: 'installed',
            },
            updated_at: '2025-03-26T14:06:27.611Z',
          },
        ],
      });

      const res = await fetchAndCompareSyncedIntegrations(
        esClientMock,
        soClientMock,
        'fleet-synced-integrations-ccr-*',
        loggerMock
      );

      expect(res).toEqual({
        integrations: [
          {
            package_name: 'system',
            package_version: '1.67.3',
            sync_status: 'completed',
            updated_at: expect.any(String),
          },
        ],
        custom_assets: {
          error: 'Error in getPipeline',
        },
      });
    });
  });
});
