/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { BackgroundSessionExampleApp } from './components/app';

export const renderApp = (
  { notifications, http, savedObjects }: CoreStart,
  { data, dataEnhanced, navigation }: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <BackgroundSessionExampleApp
      savedObjectsClient={savedObjects.client}
      basename={appBasePath}
      notifications={notifications}
      http={http}
      navigation={navigation}
      data={data}
      dataEnhanced={dataEnhanced}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
