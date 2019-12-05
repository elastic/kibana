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

  legacy: {
    I18nContext: any;
    xpackInfo: any;
    autoLogout: () => void;
    kbnUrlWrapper: { change: (url: string) => void };
    refreshXpack: () => void;
  };

  toasts: ToastsSetup;
  docLinks: DocLinksStart;
  http: HttpSetup;
}

export const boot = (deps: AppDependencies) => {
  const { element, legacy, toasts, docLinks, http } = deps;
  const { I18nContext, ...restLegacy } = legacy;
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
  const securityDocumentationLink = `${esBase}/security-settings.html`;

  const initialState = { license: legacy.xpackInfo.get('license') };

  setDocLinks({ securityDocumentationLink });

  const services = {
    legacy: {
      autoLogout: restLegacy.autoLogout,
      kbnUrl: restLegacy.kbnUrlWrapper,
      refreshXpack: restLegacy.refreshXpack,
      xPackInfo: legacy.xpackInfo,
    },
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
