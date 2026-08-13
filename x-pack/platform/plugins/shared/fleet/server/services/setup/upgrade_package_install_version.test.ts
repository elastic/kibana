/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { reinstallPackageForInstallation } from '../epm/packages';
import { PackageAlreadyInstalledError, PackageNotFoundError } from '../../errors';
import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';

import { upgradePackageInstallVersion } from './upgrade_package_install_version';

jest.mock('../epm/packages');

const mockedReinstallPackageForInstallation = jest.mocked(reinstallPackageForInstallation);

describe('upgradePackageInstallVersion', () => {
  beforeEach(() => {
    mockedReinstallPackageForInstallation.mockReset();
    mockedReinstallPackageForInstallation.mockResolvedValue({} as any);
    appContextService.start(createAppContextStartContractMock());
    jest.spyOn(appContextService, 'getKibanaVersion').mockReturnValue('9.1.0');
  });

  afterEach(() => {
    appContextService.stop();
  });
  it('should upgrade outdated package version', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValue({
      total: 2,
      saved_objects: [
        {
          attributes: { name: 'test1' },
        },
        {
          attributes: { name: 'test2' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(mockedReinstallPackageForInstallation).toBeCalledTimes(2);
    expect(mockedReinstallPackageForInstallation).toBeCalledWith(
      expect.objectContaining({
        installation: expect.objectContaining({ name: 'test1' }),
      })
    );
    expect(mockedReinstallPackageForInstallation).toBeCalledWith(
      expect.objectContaining({
        installation: expect.objectContaining({ name: 'test2' }),
      })
    );

    expect(logger.warn).not.toBeCalled();
    expect(logger.error).not.toBeCalled();
  });

  it('should log at error level when an error happens while reinstalling package', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedReinstallPackageForInstallation.mockRejectedValue(new Error('test error'));
    soClient.find.mockResolvedValue({
      total: 2,
      saved_objects: [
        {
          attributes: { name: 'test1' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(logger.error).toBeCalled();
  });

  it('should log a warn level when an error happens while reinstalling an uploaded package', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedReinstallPackageForInstallation.mockRejectedValue(new Error('test error'));
    soClient.find.mockResolvedValue({
      total: 2,
      saved_objects: [
        {
          attributes: { name: 'test1', install_source: 'upload' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(logger.warn).toBeCalled();
  });

  it('should stamp the current version and log a warn level when an uploaded package has no matching bundled package to reinstall from', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedReinstallPackageForInstallation.mockRejectedValue(
      new PackageAlreadyInstalledError('Cannot reinstall an uploaded package')
    );
    soClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          id: 'test1-so-id',
          attributes: { name: 'test1', install_source: 'upload' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(soClient.update).toBeCalledWith(
      'epm-packages',
      'test1-so-id',
      expect.objectContaining({ installed_kibana_version: '9.1.0' })
    );
    expect(logger.warn).toBeCalled();
    expect(logger.error).not.toBeCalled();
  });

  it('should stamp the current version and log a warn level when a bundled package has no matching bundled package to reinstall from', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedReinstallPackageForInstallation.mockRejectedValue(
      new PackageNotFoundError('Cannot reinstall: test1, bundled package not found')
    );
    soClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          id: 'test1-so-id',
          attributes: { name: 'test1', install_source: 'bundled' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(soClient.update).toBeCalledWith(
      'epm-packages',
      'test1-so-id',
      expect.objectContaining({ installed_kibana_version: '9.1.0' })
    );
    expect(logger.warn).toBeCalled();
    expect(logger.error).not.toBeCalled();
  });

  it('should reinstall a package whose Kibana assets were installed on a different Kibana major.minor version, even when the install format version is up to date', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          attributes: {
            name: 'test1',
            install_format_schema_version: '1.5.0',
            installed_kibana_version: '9.0.0',
          },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(mockedReinstallPackageForInstallation).toBeCalledTimes(1);
    expect(mockedReinstallPackageForInstallation).toBeCalledWith(
      expect.objectContaining({
        installation: expect.objectContaining({ name: 'test1' }),
      })
    );
  });

  it('should not reinstall a package that is up to date on both install format version and Kibana version', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          attributes: {
            name: 'test1',
            install_format_schema_version: '1.5.0',
            installed_kibana_version: '9.1.0',
          },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(mockedReinstallPackageForInstallation).not.toBeCalled();
  });
});
