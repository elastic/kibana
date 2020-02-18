/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';

import { API_BASE_PATH } from '../../common/constants';

import { setDependencyCache } from '../shared_imports';
import { AppDependencies } from '../shim';

import { AuthorizationProvider } from './lib/authorization';

const legacyBasePath = {
  prepend: chrome.addBasePath,
  get: chrome.getBasePath,
  remove: () => {},
};
const legacyDocLinks = {
  ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
  DOC_LINK_VERSION: metadata.branch,
};

let DependenciesContext: React.Context<AppDependencies>;

const setAppDependencies = (deps: AppDependencies) => {
  setDependencyCache({
    autocomplete: deps.plugins.data.autocomplete,
    docLinks: legacyDocLinks as any,
    basePath: legacyBasePath as any,
    XSRF: chrome.getXsrfToken(),
  });
  DependenciesContext = createContext<AppDependencies>(deps);
  return DependenciesContext.Provider;
};

export const useAppDependencies = () => {
  if (!DependenciesContext) {
    throw new Error(`The app dependencies Context hasn't been set.
    Use the "setAppDependencies()" method when bootstrapping the app.`);
  }
  return useContext<AppDependencies>(DependenciesContext);
};

export const getAppProviders = (deps: AppDependencies) => {
  const I18nContext = deps.core.i18n.Context;

  // Create App dependencies context and get its provider
  const AppDependenciesProvider = setAppDependencies(deps);

  return ({ children }: { children: ReactNode }) => (
    <AuthorizationProvider
      privilegesEndpoint={deps.core.http.basePath.prepend(`${API_BASE_PATH}privileges`)}
    >
      <I18nContext>
        <HashRouter>
          <AppDependenciesProvider value={deps}>{children}</AppDependenciesProvider>
        </HashRouter>
      </I18nContext>
    </AuthorizationProvider>
  );
};
