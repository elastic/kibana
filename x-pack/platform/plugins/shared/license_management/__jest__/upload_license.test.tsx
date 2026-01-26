/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import type { LocationDescriptorObject } from 'history';
import { coreMock, httpServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { uploadLicense } from '../public/application/store/actions/upload_license';

import { licenseManagementStore } from '../public/application/store/store';

import { UploadLicense } from '../public/application/sections/upload_license';
import { AppContextProvider, type AppDependencies } from '../public/application/app_context';
import { BreadcrumbService } from '../public/application/breadcrumbs';

import {
  UPLOAD_LICENSE_EXPIRED,
  UPLOAD_LICENSE_REQUIRES_ACK,
  UPLOAD_LICENSE_SUCCESS,
  UPLOAD_LICENSE_TLS_NOT_ENABLED,
  UPLOAD_LICENSE_INVALID,
} from './api_responses';

describe('UploadLicense', () => {
  let history: ReturnType<typeof scopedHistoryMock.create>;
  let breadcrumbService: BreadcrumbService;
  let licensing: ReturnType<typeof licensingMock.createSetup>;
  let appDependencies: AppDependencies;
  let thunkServices: {
    http: ReturnType<typeof httpServiceMock.createSetupContract>;
    history: ReturnType<typeof scopedHistoryMock.create>;
    breadcrumbService: BreadcrumbService;
    licensing: ReturnType<typeof licensingMock.createSetup>;
  };

  const renderComponent = (store: ReturnType<typeof licenseManagementStore>) => {
    return render(
      <I18nProvider>
        <AppContextProvider value={appDependencies}>
          <Provider store={store}>
            <UploadLicense history={history} />
          </Provider>
        </AppContextProvider>
      </I18nProvider>
    );
  };

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        reload: jest.fn(),
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    history = scopedHistoryMock.create();
    history.createHref.mockImplementation((location: LocationDescriptorObject) => {
      return `${location.pathname}${location.search ? '?' + location.search : ''}`;
    });

    breadcrumbService = new BreadcrumbService();
    breadcrumbService.setup(jest.fn());

    licensing = licensingMock.createSetup();

    appDependencies = {
      core: coreMock.createStart(),
      services: {
        breadcrumbService,
        history,
      },
      plugins: {
        licensing,
      },
      docLinks: {
        security: 'https://docs.elastic.co',
      },
      store: {
        initialLicense: licensingMock.createLicense(),
      },
      config: {
        ui: { enabled: true },
      },
    };

    thunkServices = {
      http: httpServiceMock.createSetupContract(),
      history,
      breadcrumbService,
      licensing,
    };

    licensing.refresh.mockResolvedValue(appDependencies.store.initialLicense);
  });

  it('should display an error when submitting invalid JSON', async () => {
    const store = licenseManagementStore({}, thunkServices);
    const rendered = renderComponent(store);

    await act(async () => {
      await store.dispatch(uploadLicense('INVALID', 'trial'));
    });

    await screen.findByText(/Check your license file\./);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it('should display an error when ES says license is invalid', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_INVALID[2]));
    const store = licenseManagementStore({}, thunkServices);
    const rendered = renderComponent(store);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    await act(async () => {
      await store.dispatch(uploadLicense(invalidLicense, 'trial'));
    });

    await screen.findByText('The supplied license is not valid for this product.');
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it('should display an error when ES says license is expired', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_EXPIRED[2]));
    const store = licenseManagementStore({}, thunkServices);
    const rendered = renderComponent(store);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    await act(async () => {
      await store.dispatch(uploadLicense(invalidLicense, 'trial'));
    });

    await screen.findByText('The supplied license has expired.');
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it('should display a modal when license requires acknowledgement', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_REQUIRES_ACK[2]));
    const store = licenseManagementStore({}, thunkServices);
    const rendered = renderComponent(store);
    const unacknowledgedLicense = JSON.stringify({
      license: { type: 'basic' },
    });
    await act(async () => {
      await store.dispatch(uploadLicense(unacknowledgedLicense, 'trial'));
    });

    await screen.findByText('Confirm License Upload');
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it('should refresh xpack info and navigate to BASE_PATH when ES accepts new license', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_SUCCESS[2]));
    const store = licenseManagementStore({}, thunkServices);
    const validLicense = JSON.stringify({ license: { type: 'basic' } });
    await store.dispatch(uploadLicense(validLicense, 'trial'));
    expect(appDependencies.plugins.licensing.refresh).toHaveBeenCalled();
    expect(thunkServices.history.replace).toHaveBeenCalled();
  });

  it('should display error when ES returns error', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_TLS_NOT_ENABLED[2]));
    const store = licenseManagementStore({}, thunkServices);
    const rendered = renderComponent(store);
    const license = JSON.stringify({ license: { type: 'basic' } });
    await act(async () => {
      await store.dispatch(uploadLicense(license, 'trial'));
    });

    await screen.findByText(/Error encountered uploading license:/);
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
