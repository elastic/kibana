/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  ElasticsearchClient,
  SavedObject,
} from '@kbn/core/server';
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import {
  MAX_TIME_COMPLETE_INSTALL,
  PACKAGES_SAVED_OBJECT_TYPE,
} from '../../../../../../common/constants';

import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';

import { INSTALL_STATES } from '../../../../../../common/types';

import { auditLoggingService } from '../../../../audit_logging';
import { restartInstallation, createInstallation } from '../../install';
import type { Installation } from '../../../../../../common';

import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';

import { stepCreateRestartInstallation } from './step_create_restart_installation';

jest.mock('../../../../audit_logging');
jest.mock('../../install');

const mockedRestartInstallation = jest.mocked(restartInstallation);
const mockedCreateInstallation = createInstallation as jest.Mocked<typeof createInstallation>;

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('stepCreateRestartInstallation', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();

  describe('When package is stuck in `installing`', () => {
    const mockInstalledPackageSo: SavedObject<Installation> = {
      id: 'mocked-package',
      attributes: {
        name: 'test-package',
        version: '1.0.0',
        install_status: 'installing',
        install_version: '1.0.0',
        install_started_at: new Date().toISOString(),
        install_source: 'registry',
        verification_status: 'verified',
        installed_kibana: [] as any,
        installed_es: [] as any,
        es_index_patterns: {},
      },
      type: PACKAGES_SAVED_OBJECT_TYPE,
      references: [],
    };

    beforeEach(async () => {
      soClient = savedObjectsClientMock.create();
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      appContextService.start(createAppContextStartContractMock());
    });
    afterEach(() => {
      mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
      soClient.update.mockReset();
    });

    it('Should call createInstallation if no installedPkg is available', async () => {
      await stepCreateRestartInstallation({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger,
        packageInstallContext: {
          assetsMap: new Map(),
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'xyz',
            version: '4.5.6',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
        latestExecutedState: {
          name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
          started_at: new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL * 2).toISOString(),
        },
        installType: 'install',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
      });
      expect(logger.debug).toHaveBeenCalledWith(`Package install - Create installation`);
      expect(mockedCreateInstallation).toHaveBeenCalledTimes(1);
    });

    describe('When timeout is not reached', () => {
      it('Should throw if installedPkg is available and force is not provided', async () => {
        const promise = stepCreateRestartInstallation({
          savedObjectsClient: soClient,
          // @ts-ignore
          savedObjectsImporter: jest.fn(),
          esClient,
          logger,
          packageInstallContext: {
            assetsMap: new Map(),
            archiveIterator: createArchiveIteratorFromMap(new Map()),
            paths: [],
            packageInfo: {
              title: 'title',
              name: 'xyz',
              version: '4.5.6',
              description: 'test',
              type: 'integration',
              categories: ['cloud', 'custom'],
              format_version: 'string',
              release: 'experimental',
              conditions: { kibana: { version: 'x.y.z' } },
              owner: { github: 'elastic/fleet' },
            },
          },
          installedPkg: {
            ...mockInstalledPackageSo,
            attributes: {
              ...mockInstalledPackageSo.attributes,
              install_started_at: new Date(Date.now() - 1000).toISOString(),
            },
          },
          latestExecutedState: {
            name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
            started_at: new Date(Date.now() - 1000).toISOString(),
          },
          installType: 'install',
          installSource: 'registry',
          spaceId: DEFAULT_SPACE_ID,
        });

        await expect(promise).rejects.toThrowError(
          'Concurrent installation or upgrade of xyz-4.5.6 detected, aborting.'
        );
      });

      it('Should call restartInstallation if installedPkg is available and force = true', async () => {
        await stepCreateRestartInstallation({
          savedObjectsClient: soClient,
          // @ts-ignore
          savedObjectsImporter: jest.fn(),
          esClient,
          logger,
          packageInstallContext: {
            assetsMap: new Map(),
            archiveIterator: createArchiveIteratorFromMap(new Map()),
            paths: [],
            packageInfo: {
              title: 'title',
              name: 'xyz',
              version: '4.5.6',
              description: 'test',
              type: 'integration',
              categories: ['cloud', 'custom'],
              format_version: 'string',
              release: 'experimental',
              conditions: { kibana: { version: 'x.y.z' } },
              owner: { github: 'elastic/fleet' },
            },
          },
          installedPkg: {
            ...mockInstalledPackageSo,
            attributes: {
              ...mockInstalledPackageSo.attributes,
              install_started_at: new Date(Date.now() - 1000).toISOString(),
            },
          },
          force: true,
          latestExecutedState: {
            name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
            started_at: new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL * 2).toISOString(),
          },
          installType: 'install',
          installSource: 'registry',
          spaceId: DEFAULT_SPACE_ID,
        });
        expect(mockedRestartInstallation).toHaveBeenCalledTimes(1);
      });
    });

    describe('When timeout is reached', () => {
      it('Should call restartInstallation', async () => {
        await stepCreateRestartInstallation({
          savedObjectsClient: soClient,
          // @ts-ignore
          savedObjectsImporter: jest.fn(),
          esClient,
          logger,
          packageInstallContext: {
            assetsMap: new Map(),
            archiveIterator: createArchiveIteratorFromMap(new Map()),
            paths: [],
            packageInfo: {
              title: 'title',
              name: 'xyz',
              version: '4.5.6',
              description: 'test',
              type: 'integration',
              categories: ['cloud', 'custom'],
              format_version: 'string',
              release: 'experimental',
              conditions: { kibana: { version: 'x.y.z' } },
              owner: { github: 'elastic/fleet' },
            },
          },
          installedPkg: {
            ...mockInstalledPackageSo,
            attributes: {
              ...mockInstalledPackageSo.attributes,
              install_started_at: new Date(
                Date.now() - MAX_TIME_COMPLETE_INSTALL * 2
              ).toISOString(),
            },
          },

          installType: 'install',
          installSource: 'registry',
          spaceId: DEFAULT_SPACE_ID,
        });

        expect(mockedRestartInstallation).toBeCalled();
      });
    });
  });
});
