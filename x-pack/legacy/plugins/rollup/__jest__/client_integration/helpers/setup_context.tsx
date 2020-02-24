/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
const startMock = coreMock.createStart();

const services = {
  setBreadcrumbs: startMock.chrome.setBreadcrumbs,
};

const wrapComponent = (Component: FunctionComponent) => (props: any) => (
  <KibanaContextProvider services={services}>
    <Component {...props} />
  </KibanaContextProvider>
);

export { wrapComponent };
