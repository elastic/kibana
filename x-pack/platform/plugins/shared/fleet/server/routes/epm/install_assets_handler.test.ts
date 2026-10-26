/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';

import type { FleetRequestHandlerContext } from '../../types';
import { FleetNotFoundError } from '../../errors';
import { appContextService } from '../../services';
import {
  getInstallationObject,
  getInstalledPackageWithAssets,
} from '../../services/epm/packages/get';
import { stepInstallWorkflows } from '../../services/epm/packages/install_state_machine/steps/step_install_workflows';
import { stepCreateAlertingAssets } from '../../services/epm/packages/install_state_machine/steps/step_create_alerting_assets';
import { xpackMocks } from '../../mocks';

import { installRuleAssetsHandler, installWorkflowAssetsHandler } from './install_assets_handler';

jest.mock('../../services/epm/packages/get');
jest.mock('../../services/epm/packages/install_state_machine/steps/step_install_workflows');
jest.mock('../../services/epm/packages/install_state_machine/steps/step_create_alerting_assets');
jest.mock('../../services/epm/kibana/assets/install', () => ({
  installKibanaAssetsAndReferences: jest.fn(),
  deleteKibanaAssetsAndReferencesForSpace: jest.fn(),
}));
jest.mock('../../services/epm/archive/archive_iterator', () => ({
  createArchiveIteratorFromMap: jest.fn().mockReturnValue({ traverseEntries: jest.fn() }),
}));

const mockedGetInstalledPackageWithAssets = getInstalledPackageWithAssets as jest.MockedFunction<
  typeof getInstalledPackageWithAssets
>;
const mockedGetInstallationObject = getInstallationObject as jest.MockedFunction<
  typeof getInstallationObject
>;
const mockedStepInstallWorkflows = stepInstallWorkflows as jest.MockedFunction<
  typeof stepInstallWorkflows
>;
const mockedStepCreateAlertingAssets = stepCreateAlertingAssets as jest.MockedFunction<
  typeof stepCreateAlertingAssets
>;

const PKG_NAME = 'my_pkg';
const PKG_VERSION = '1.0.0';

const installedPkgWithAssets = {
  installation: { version: PKG_VERSION },
  packageInfo: { name: PKG_NAME, title: 'My package', version: PKG_VERSION },
  paths: [`${PKG_NAME}-${PKG_VERSION}/kibana/workflow/my_pkg-hello.yml`],
  assetsMap: new Map(),
};

const installation = {
  attributes: {
    version: PKG_VERSION,
    installed_kibana_space_id: 'default',
  },
};

describe('installWorkflowAssetsHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.resetAllMocks();
    appContextService.getLogger = () => loggingSystemMock.createLogger();
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    mockedGetInstalledPackageWithAssets.mockResolvedValue(installedPkgWithAssets as any);
    mockedGetInstallationObject.mockResolvedValue(installation as any);
    mockedStepInstallWorkflows.mockResolvedValue(undefined);
  });

  it('calls stepInstallWorkflows and returns success', async () => {
    const request = httpServerMock.createKibanaRequest({
      params: { pkgName: PKG_NAME, pkgVersion: PKG_VERSION },
    });

    await installWorkflowAssetsHandler(context, request, response);

    expect(mockedStepInstallWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        installedPkg: installation,
        installAsAdditionalSpace: false,
        upgradeAdditionalSpaces: false,
        packageInstallContext: expect.objectContaining({
          packageInfo: installedPkgWithAssets.packageInfo,
          paths: installedPkgWithAssets.paths,
        }),
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { success: true } });
  });

  it('throws when the requested package version is not installed', async () => {
    mockedGetInstallationObject.mockResolvedValue(undefined);
    const request = httpServerMock.createKibanaRequest({
      params: { pkgName: PKG_NAME, pkgVersion: PKG_VERSION },
    });

    await expect(installWorkflowAssetsHandler(context, request, response)).rejects.toThrow(
      new FleetNotFoundError('Requested version is not installed')
    );
    expect(mockedStepInstallWorkflows).not.toHaveBeenCalled();
  });
});

describe('installRuleAssetsHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.resetAllMocks();
    appContextService.getLogger = () => loggingSystemMock.createLogger();
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    mockedGetInstalledPackageWithAssets.mockResolvedValue(installedPkgWithAssets as any);
    mockedGetInstallationObject.mockResolvedValue(installation as any);
    mockedStepCreateAlertingAssets.mockResolvedValue(undefined);
  });

  it('does not install workflow assets', async () => {
    const request = httpServerMock.createKibanaRequest({
      params: { pkgName: PKG_NAME, pkgVersion: PKG_VERSION },
    });

    await installRuleAssetsHandler(context, request, response);

    expect(mockedStepInstallWorkflows).not.toHaveBeenCalled();
    expect(mockedStepCreateAlertingAssets).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({ body: { success: true } });
  });
});
