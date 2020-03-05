/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';

// needed to make syntax highlighting work in ace editors
import 'ace';
import { AppMountParameters, CoreStart } from 'kibana/public';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { SecurityPluginSetup } from '../../../../../plugins/security/public';
import { LicensingPluginSetup } from '../../../../../plugins/licensing/public';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { setDependencyCache, clearCache } from './util/dependency_cache';
import { setLicenseCache } from './license';

import { MlRouter } from './routing';

export interface MlDependencies extends AppMountParameters {
  data: DataPublicPluginStart;
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  __LEGACY: {
    XSRF: string;
  };
}

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
}

const App: FC<AppProps> = ({ coreStart, deps }) => {
  setDependencyCache({
    indexPatterns: deps.data.indexPatterns,
    timefilter: deps.data.query.timefilter,
    fieldFormats: deps.data.fieldFormats,
    autocomplete: deps.data.autocomplete,
    config: coreStart.uiSettings!,
    chrome: coreStart.chrome!,
    docLinks: coreStart.docLinks!,
    toastNotifications: coreStart.notifications.toasts,
    overlays: coreStart.overlays,
    recentlyAccessed: coreStart.chrome!.recentlyAccessed,
    basePath: coreStart.http.basePath,
    savedObjectsClient: coreStart.savedObjects.client,
    XSRF: deps.__LEGACY.XSRF,
    application: coreStart.application,
    http: coreStart.http,
    security: deps.security,
  });

  const mlLicense = setLicenseCache(deps.licensing);

  deps.onAppLeave(actions => {
    mlLicense.unsubscribe();
    clearCache();
    return actions.default();
  });

  const pageDeps = {
    indexPatterns: deps.data.indexPatterns,
    config: coreStart.uiSettings!,
    setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
  };

  const services = {
    appName: 'ML',
    data: deps.data,
    security: deps.security,
    ...coreStart,
  };

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
