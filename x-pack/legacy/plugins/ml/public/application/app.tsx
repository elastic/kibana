/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';

// needed to make syntax highlighting work in ace editors
import 'ace';
import {
  AppMountParameters,
  CoreStart,
  // AppMountContext,
  // ChromeStart,
  // LegacyCoreStart,
  // SavedObjectsClientContract,
  // ToastsStart,
  // IUiSettingsClient,
} from 'kibana/public';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

import { MlRouter } from './routing';
export { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export interface MlDependencies extends AppMountParameters {
  data: DataPublicPluginStart;
}

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
}

const App: FC<AppProps> = ({ coreStart, deps }) => {
  return (
    <KibanaContextProvider
      services={{
        appName: 'ML',
        data: deps.data,
        ...coreStart,
      }}
    >
      <MlRouter />
    </KibanaContextProvider>
  );
};

export const renderApp = (coreStart: CoreStart, depsStart: object, deps: MlDependencies) => {
  ReactDOM.render(<App coreStart={coreStart} deps={deps} />, deps.element);

  return () => ReactDOM.unmountComponentAtNode(deps.element);
};
