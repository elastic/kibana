/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';

const mockGetCreateCaseFlyout = jest.fn();
const mockGetAllCasesSelectorModal = jest.fn();
const mockNavigateToApp = jest.fn();

const createStartServicesMock = (): CoreStart => {
  const coreServices = coreMock.createStart();
  return {
    ...coreServices,
    cases: {
      getAllCases: jest.fn(),
      getCaseView: jest.fn(),
      getConfigureCases: jest.fn(),
      getCreateCase: jest.fn(),
      getRecentCases: jest.fn(),
      getCreateCaseFlyout: mockGetCreateCaseFlyout,
      getAllCasesSelectorModal: mockGetAllCasesSelectorModal,
    },
    application: {
      ...coreServices.application,
      navigateToApp: mockNavigateToApp,
    },
  } as unknown as CoreStart;
};

export const createKibanaContextProviderMock = () => {
  const services = createStartServicesMock();

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);
};
