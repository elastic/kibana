/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, chromeServiceMock } from '../../../../../src/core/public/mocks';
import { mountWithIntl } from '../../../../test_utils/enzyme_helpers';
import React from 'react';
import { Provider } from 'react-redux';

// @ts-ignore
import { uploadLicense } from '../public/np_ready/application/store/actions/upload_license';

// @ts-ignore
import { licenseManagementStore } from '../public/np_ready/application/store/store';

// @ts-ignore
import { UploadLicense } from '../public/np_ready/application/sections/upload_license';

import {
  UPLOAD_LICENSE_EXPIRED,
  UPLOAD_LICENSE_REQUIRES_ACK,
  UPLOAD_LICENSE_SUCCESS,
  UPLOAD_LICENSE_TLS_NOT_ENABLED,
  UPLOAD_LICENSE_INVALID,
  // @ts-ignore
} from './api_responses';

window.location.reload = () => {};

let store: any = null;
let component: any = null;
const services = {
  legacy: {
    xPackInfo: {
      refresh: jest.fn(),
      get: () => {
        return { license: { type: 'basic' } };
      },
    },
    refreshXpack: jest.fn(),
  },
  http: httpServiceMock.createSetupContract(),
  chrome: chromeServiceMock.createStartContract(),
  history: {
    replace: jest.fn(),
  },
};

describe('UploadLicense', () => {
  beforeEach(() => {
    store = licenseManagementStore({}, services);
    component = (
      <Provider store={store}>
        <UploadLicense />
      </Provider>
    );
  });

  afterEach(() => {
    services.legacy.xPackInfo.refresh.mockReset();
    services.history.replace.mockReset();
    jest.clearAllMocks();
  });

  it('should display an error when submitting invalid JSON', async () => {
    const rendered = mountWithIntl(component);
    store.dispatch(uploadLicense('INVALID', 'trial'));
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });

  it('should display an error when ES says license is invalid', async () => {
    services.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_INVALID[2]));
    const rendered = mountWithIntl(component);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(invalidLicense)(store.dispatch, null, services);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });

  it('should display an error when ES says license is expired', async () => {
    services.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_EXPIRED[2]));
    const rendered = mountWithIntl(component);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(invalidLicense)(store.dispatch, null, services);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });

  it('should display a modal when license requires acknowledgement', async () => {
    services.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_REQUIRES_ACK[2]));
    const unacknowledgedLicense = JSON.stringify({
      license: { type: 'basic' },
    });
    await uploadLicense(unacknowledgedLicense, 'trial')(store.dispatch, null, services);
    const rendered = mountWithIntl(component);
    expect(rendered).toMatchSnapshot();
  });

  it('should refresh xpack info and navigate to BASE_PATH when ES accepts new license', async () => {
    services.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_SUCCESS[2]));
    const validLicense = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(validLicense)(store.dispatch, null, services);
    expect(services.legacy.refreshXpack).toHaveBeenCalled();
    expect(services.history.replace).toHaveBeenCalled();
  });

  it('should display error when ES returns error', async () => {
    services.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_TLS_NOT_ENABLED[2]));
    const rendered = mountWithIntl(component);
    const license = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(license)(store.dispatch, null, services);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });
});
