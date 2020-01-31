/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from '../../../../test_utils/enzyme_helpers';
import React from 'react';
import { Provider } from 'react-redux';
import { uploadLicense } from '../public/store/actions/upload_license';
import { licenseManagementStore } from '../public/store/store';
import { UploadLicense } from '../public/sections/upload_license';
import { BASE_PATH } from '../common/constants';
import {
  UPLOAD_LICENSE_EXPIRED,
  UPLOAD_LICENSE_REQUIRES_ACK,
  UPLOAD_LICENSE_SUCCESS,
  UPLOAD_LICENSE_TLS_NOT_ENABLED,
  UPLOAD_LICENSE_INVALID,
} from './api_responses';

import sinon from 'sinon';
window.location.reload = () => {};
let server = null;
let store = null;
let component = null;
const services = {
  kbnUrl: {
    change: jest.fn(),
  },
  autoLogout: () => {},
  xPackInfo: {
    refresh: jest.fn(),
    get: () => {
      return { license: { type: 'basic' } };
    },
  },
};

describe('UploadLicense', () => {
  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    store = licenseManagementStore({}, services);
    component = (
      <Provider store={store}>
        <UploadLicense />
      </Provider>
    );
  });
  afterEach(() => {
    server.restore();
    services.xPackInfo.refresh.mockReset();
    services.kbnUrl.change.mockReset();
  });
  it('should display an error when submitting invalid JSON', async () => {
    const rendered = mountWithIntl(component);
    store.dispatch(uploadLicense('INVALID', 'trial'));
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });
  it('should display an error when ES says license is invalid', async () => {
    const rendered = mountWithIntl(component);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    server.respond(UPLOAD_LICENSE_INVALID);
    await uploadLicense(invalidLicense)(store.dispatch, null, services);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });
  it('should display an error when ES says license is expired', async () => {
    const rendered = mountWithIntl(component);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    server.respond(UPLOAD_LICENSE_EXPIRED);
    await uploadLicense(invalidLicense)(store.dispatch, null, services);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });
  it('should display a modal when license requires acknowledgement', async () => {
    const unacknowledgedLicense = JSON.stringify({
      license: { type: 'basic' },
    });
    server.respond(UPLOAD_LICENSE_REQUIRES_ACK);
    await uploadLicense(unacknowledgedLicense, 'trial')(store.dispatch, null, services);
    const rendered = mountWithIntl(component);
    expect(rendered).toMatchSnapshot();
  });
  it('should refresh xpack info and navigate to BASE_PATH when ES accepts new license', async () => {
    const validLicense = JSON.stringify({ license: { type: 'basic' } });
    server.respond(UPLOAD_LICENSE_SUCCESS);
    await uploadLicense(validLicense)(store.dispatch, null, services);
    expect(services.xPackInfo.refresh).toHaveBeenCalled();
    expect(services.kbnUrl.change).toHaveBeenCalledWith(BASE_PATH);
  });
  it('should display error when ES returns error', async () => {
    const rendered = mountWithIntl(component);
    const license = JSON.stringify({ license: { type: 'basic' } });
    server.respond(UPLOAD_LICENSE_TLS_NOT_ENABLED);
    await uploadLicense(license)(store.dispatch, null, services);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });
});
