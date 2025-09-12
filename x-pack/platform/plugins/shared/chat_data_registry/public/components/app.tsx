/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

import { PLUGIN_NAME } from '../../common';

interface ChatDataRegistryAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

export const ChatDataRegistryApp = ({ basename, notifications, http }: ChatDataRegistryAppDeps) => {
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <EuiPageTemplate restrictWidth="1000px">
            <EuiPageTemplate.Header>
              <EuiTitle size="l">
                <h1>
                  <FormattedMessage
                    id="chatDataRegistry.helloWorldText"
                    defaultMessage="{name}"
                    values={{ name: PLUGIN_NAME }}
                  />
                </h1>
              </EuiTitle>
            </EuiPageTemplate.Header>
            <EuiPageTemplate.Section />
          </EuiPageTemplate>
        </>
      </I18nProvider>
    </Router>
  );
};
