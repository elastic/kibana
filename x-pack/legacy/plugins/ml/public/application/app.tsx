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
  // DocLinksStart,
} from 'kibana/public';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { useDependencyCache } from './util/dependency_cache';

import { MlRouter, PageDependencies } from './routing';

export interface MlDependencies extends AppMountParameters {
  data: DataPublicPluginStart;
}

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
}

const App: FC<AppProps> = ({ coreStart, deps }) => {
  const pageDeps: PageDependencies = {
    indexPatterns: deps.data.indexPatterns,
    timefilter: deps.data.query.timefilter,
    config: coreStart.uiSettings!,
    chrome: coreStart.chrome!,
    docLinks: coreStart.docLinks!,
    toastNotifications: coreStart.notifications.toasts,
    overlays: coreStart.overlays,
  };

  const services = {
    appName: 'ML',
    data: deps.data,
    ...coreStart,
  };

  useDependencyCache(pageDeps);

  const I18nContext = coreStart.i18n.Context;
  return (
    <I18nContext>
      <KibanaContextProvider services={services}>
        <MlRouter pageDeps={pageDeps} />
      </KibanaContextProvider>
    </I18nContext>
  );
};

export const renderApp = (coreStart: CoreStart, depsStart: object, deps: MlDependencies) => {
  ReactDOM.render(<App coreStart={coreStart} deps={deps} />, deps.element);

  return () => ReactDOM.unmountComponentAtNode(deps.element);
};
