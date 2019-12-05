/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Provider } from 'react-redux';
import { licenseManagementStore } from '../../public/np_ready/application/store/store';
import React from 'react';
import { mountWithIntl } from '../../../../../test_utils/enzyme_helpers';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';

const highExpirationMillis = new Date('October 13, 2099 00:00:00Z').getTime();

export const createMockLicense = (
  type,
  expiryDateInMillis = highExpirationMillis
) => {
  return {
    type,
    expiryDateInMillis,
    isActive: new Date().getTime() < expiryDateInMillis
  };
};
export const getComponent = (initialState, Component) => {
  const services = {
    http: httpServiceMock.createSetupContract()
  };
  const store = licenseManagementStore(initialState, services);
  return mountWithIntl(
    <Provider store={store}>
      <Component />
    </Provider>
  );
};
