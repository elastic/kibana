/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SmlCrawlersPage } from './sml_crawlers_page';

interface MountSectionParams {
  core: CoreSetup;
  mountParams: ManagementAppMountParams;
}

const PAGE_TITLE = 'SML Crawlers';

export const mountManagementSection = async ({
  core,
  mountParams: { element, setBreadcrumbs },
}: MountSectionParams) => {
  const [coreStart] = await core.getStartServices();
  coreStart.chrome.docTitle.change(PAGE_TITLE);

  setBreadcrumbs([{ text: 'AI' }, { text: PAGE_TITLE }]);

  const App = () => (
    <I18nProvider>
      <KibanaContextProvider services={coreStart}>
        <SmlCrawlersPage http={coreStart.http} notifications={coreStart.notifications} />
      </KibanaContextProvider>
    </I18nProvider>
  );

  ReactDOM.render(wrapWithTheme(<App />, core.theme), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
