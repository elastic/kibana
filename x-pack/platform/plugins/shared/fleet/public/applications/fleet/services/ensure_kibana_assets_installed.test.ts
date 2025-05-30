/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toastsServiceMock } from '@kbn/core-notifications-browser-mocks/src/toasts_service.mock';

import { sendGetPackageInfoByKeyForRq, sendInstallKibanaAssetsForRq } from '../../../hooks';

import { ensurePackageKibanaAssetsInstalled } from './ensure_kibana_assets_installed';

jest.mock('../../../hooks');

describe('ensurePackageKibanaAssetsInstalled', () => {
  beforeEach(() => {
    jest.mocked(sendInstallKibanaAssetsForRq).mockReset();
  });
  it('install assets if not installed', async () => {
    jest.mocked(sendGetPackageInfoByKeyForRq).mockResolvedValue({
      item: {
        installationInfo: {
          name: 'nginx',
          version: '1.25.1',
          installed_kibana_space_id: 'default',
        },
      },
    } as any);

    const toasts = toastsServiceMock.createStartContract();

    await ensurePackageKibanaAssetsInstalled({
      currentSpaceId: 'test',
      pkgName: 'nginx',
      pkgVersion: '1.25.1',
      toasts,
    });

    expect(sendInstallKibanaAssetsForRq).toBeCalledWith({
      pkgName: 'nginx',
      pkgVersion: '1.25.1',
    });

    expect(toasts.addSuccess).toBeCalled();
  });

  it('install assets in multiple space if not installed', async () => {
    jest.mocked(sendGetPackageInfoByKeyForRq).mockResolvedValue({
      item: {
        installationInfo: {
          name: 'nginx',
          version: '1.25.1',
          installed_kibana_space_id: 'default',
        },
      },
    } as any);

    const toasts = toastsServiceMock.createStartContract();

    await ensurePackageKibanaAssetsInstalled({
      spaceIds: ['default', 'test1', 'test2'],
      pkgName: 'nginx',
      pkgVersion: '1.25.1',
      toasts,
    });

    expect(sendInstallKibanaAssetsForRq).toBeCalledWith({
      pkgName: 'nginx',
      pkgVersion: '1.25.1',
      spaceIds: ['test1', 'test2'],
    });

    expect(toasts.addSuccess).toBeCalled();
  });

  it('does nothing if assets are already installed', async () => {
    jest.mocked(sendGetPackageInfoByKeyForRq).mockResolvedValue({
      item: {
        installationInfo: {
          name: 'nginx',
          version: '1.25.1',
          installed_kibana_space_id: 'default',
          additional_spaces_installed_kibana: {
            test: [],
          },
        },
      },
    } as any);

    const toasts = toastsServiceMock.createStartContract();

    await ensurePackageKibanaAssetsInstalled({
      currentSpaceId: 'test',
      pkgName: 'nginx',
      pkgVersion: '1.25.1',
      toasts,
    });

    expect(sendInstallKibanaAssetsForRq).not.toBeCalled();
    expect(toasts.addSuccess).not.toBeCalled();
    expect(toasts.addError).not.toBeCalled();
  });

  it('show an error toast if install assets failed', async () => {
    jest.mocked(sendGetPackageInfoByKeyForRq).mockResolvedValue({
      item: {
        installationInfo: {
          name: 'nginx',
          version: '1.25.1',
          installed_kibana_space_id: 'default',
        },
      },
    } as any);

    jest.mocked(sendInstallKibanaAssetsForRq).mockRejectedValue(new Error('test123'));

    const toasts = toastsServiceMock.createStartContract();

    await ensurePackageKibanaAssetsInstalled({
      currentSpaceId: 'test',
      pkgName: 'nginx',
      pkgVersion: '1.25.1',
      toasts,
    });

    expect(toasts.addSuccess).not.toBeCalled();
    expect(toasts.addError).toBeCalled();
  });
});
