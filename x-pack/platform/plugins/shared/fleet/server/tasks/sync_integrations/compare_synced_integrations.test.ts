/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getPackageSavedObjects } from '../../services/epm/packages/get';

import { installCustomAsset, getPipeline, getComponentTemplate } from './custom_assets';
import {
  getFollowerIndexInfo,
  fetchAndCompareSyncedIntegrations,
} from './compare_synced_integrations';

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

const getPipelineMock = getPipeline as jest.Mocked<typeof getPipeline>;
const getComponentTemplateMock = getComponentTemplate as jest.Mocked<typeof getComponentTemplate>;

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
