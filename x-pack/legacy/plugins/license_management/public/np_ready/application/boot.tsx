/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import * as history from 'history';
import { DocLinksStart, HttpSetup, ToastsSetup, ChromeStart } from 'src/core/public';

// @ts-ignore
import { App } from './app.container';
// @ts-ignore
import { licenseManagementStore } from './store';

import { setDocLinks } from './lib/docs_links';
import { BASE_PATH } from '../../../common/constants';
import { Breadcrumb } from './breadcrumbs';

interface AppDependencies {
  element: HTMLElement;
  chrome: ChromeStart;

  I18nContext: any;
  legacy: {
    xpackInfo: any;
    refreshXpack: () => void;
    MANAGEMENT_BREADCRUMB: Breadcrumb;
  };

  toasts: ToastsSetup;
  docLinks: DocLinksStart;
  http: HttpSetup;
}

export const boot = (deps: AppDependencies) => {
  const { I18nContext, element, legacy, toasts, docLinks, http, chrome } = deps;
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
  const securityDocumentationLink = `${esBase}/security-settings.html`;

  const initialState = { license: legacy.xpackInfo.get('license') };

  setDocLinks({ securityDocumentationLink });

  const services = {
    legacy: {
      refreshXpack: legacy.refreshXpack,
      xPackInfo: legacy.xpackInfo,
    },
    // So we can imperatively control the hash route
    history: history.createHashHistory({ basename: BASE_PATH }),
    toasts,
    http,
    chrome,
    MANAGEMENT_BREADCRUMB: legacy.MANAGEMENT_BREADCRUMB,
  };

  const store = licenseManagementStore(initialState, services);
  render(
    <I18nContext>
      <Provider store={store}>
        <HashRouter basename={BASE_PATH}>
          <App />
        </HashRouter>
      </Provider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};
