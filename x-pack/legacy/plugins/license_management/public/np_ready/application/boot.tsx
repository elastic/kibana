/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';

import { DocLinksStart, HttpSetup, ToastsSetup } from 'src/core/public';

// @ts-ignore
import { App } from './app.container';
// @ts-ignore
import { licenseManagementStore } from './store';

import { setDocLinks } from './lib/docs_links';

interface AppDependencies {
  element: HTMLElement;
  I18nContext: any;
  xpackInfo: any;
  autoLogout: () => void;
  kbnUrlWrapper: { change: (url: string) => void };
  refreshXpack: () => void;

  toasts: ToastsSetup;
  docLinks: DocLinksStart;
  http: HttpSetup;
}

export const boot = (deps: AppDependencies) => {
  const {
    element,
    I18nContext,
    xpackInfo,
    autoLogout,
    kbnUrlWrapper,
    refreshXpack,
    toasts,
    docLinks,
    http,
  } = deps;
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
  const securityDocumentationLink = `${esBase}/security-settings.html`;

  const initialState = { license: xpackInfo.get('license') };

  setDocLinks({ securityDocumentationLink });

  const services = {
    autoLogout,
    xPackInfo: xpackInfo,
    kbnUrl: kbnUrlWrapper,
    refreshXpack,
    toasts,
    http,
  };
  const store = licenseManagementStore(initialState, services);
  render(
    <I18nContext>
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};
