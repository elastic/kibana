/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';

import { packagePolicyService } from '../..';
import { auditLoggingService } from '../../audit_logging';

import { deleteESAsset, removeInstallation, cleanupAssets } from './remove';

jest.mock('../..', () => {
  return {
    appContextService: {
      getLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }),
      getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
    },
    packagePolicyService: {
      list: jest.fn().mockImplementation((soClient, params) => {
        if (params.kuery.includes('system'))
          return Promise.resolve({ total: 1, items: [{ id: 'system-1', agents: 1 }] });
        else
          return Promise.resolve({
            total: 2,
            items: [{ id: 'elastic_agent-1' }, { id: 'elastic_agent-2' }],
          });
      }),
      delete: jest.fn(),
    },
  };
});
jest.mock('../../audit_logging');

jest.mock('../../package_policies/populate_package_policy_assigned_agents_count');

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

describe('removeInstallation', () => {
  let soClientMock: any;
  const esClientMock = {} as any;
  beforeEach(() => {
    soClientMock = {
      get: jest.fn().mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
    } as any;
  });
  it('should remove package policies when force', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'system',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });
    expect(mockPackagePolicyService.delete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['system-1'],
      { force: true }
    );
  });

  it('should throw when trying to remove package with package policies when not force', async () => {
    await expect(
      removeInstallation({
        savedObjectsClient: soClientMock,
        pkgName: 'system',
        pkgVersion: '1.0.0',
        esClient: esClientMock,
        force: false,
      })
    ).rejects.toThrowError(
      `Unable to remove package system:1.0.0 with existing package policy(s) in use by agent(s)`
    );
  });

  it('should remove package policies when not used by agents', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'elastic_agent',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: false,
    });
    expect(mockPackagePolicyService.delete).toHaveBeenCalledTimes(2);
  });

  it('should call audit logger', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'system',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'delete',
      id: 'system',
      name: 'system',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  });
});

describe('deleteESAsset', () => {
  it('should not delete @custom components template', async () => {
    const esClient = elasticsearchServiceMock.createInternalClient();
    await deleteESAsset(
      {
        id: 'logs@custom',
        type: ElasticsearchAssetType.componentTemplate,
      },
      esClient
    );

    expect(esClient.cluster.deleteComponentTemplate).not.toBeCalled();
  });

  it('should delete @package components template', async () => {
    const esClient = elasticsearchServiceMock.createInternalClient();
    await deleteESAsset(
      {
        id: 'logs-nginx.access@package',
        type: ElasticsearchAssetType.componentTemplate,
      },
      esClient
    );

    expect(esClient.cluster.deleteComponentTemplate).toBeCalledWith(
      { name: 'logs-nginx.access@package' },
      expect.anything()
    );
  });

  describe('cleanupAssets', () => {
    let soClientMock: any;
    const esClientMock = {} as any;
    beforeEach(() => {
      soClientMock = {
        get: jest
          .fn()
          .mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
        update: jest.fn().mockImplementation(async (type, id, data) => {
          return {
            id,
            type,
            attributes: {},
            references: [],
          };
        }),
        delete: jest.fn(),
        find: jest.fn().mockResolvedValue({ saved_objects: [] }),
        bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
      } as any;
    });

    it('should remove assets marked for deletion', async () => {
      const installation = {
        name: 'test',
        version: '1.0.0',
        installed_kibana: [],
        installed_es: [
          {
            id: 'logs@custom',
            type: 'component_template',
          },
          {
            id: 'udp@custom',
            type: 'component_template',
          },
          {
            id: 'logs-udp.generic',
            type: 'index_template',
          },
          {
            id: 'logs-udp.generic@package',
            type: 'component_template',
          },
        ],
        es_index_patterns: {
          generic: 'logs-generic-*',
          'udp.generic': 'logs-udp.generic-*',
          'udp.test': 'logs-udp.test-*',
        },
      } as any;
      const installationToDelete = {
        name: 'test',
        version: '1.0.0',
        installed_kibana: [],
        installed_es: [
          {
            id: 'logs-udp.generic',
            type: 'index_template',
          },
          {
            id: 'logs-udp.generic@package',
            type: 'component_template',
          },
        ],
      } as any;
      await cleanupAssets(
        'generic',
        installationToDelete,
        installation,
        esClientMock,
        soClientMock
      );

      expect(soClientMock.update).toBeCalledWith('epm-packages', 'test', {
        installed_es: [
          {
            id: 'logs@custom',
            type: 'component_template',
          },
          {
            id: 'udp@custom',
            type: 'component_template',
          },
        ],
        installed_kibana: [],
        es_index_patterns: {
          'udp.generic': 'logs-udp.generic-*',
          'udp.test': 'logs-udp.test-*',
        },
      });
    });
  });
});
