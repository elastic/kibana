/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { Source } from '../../containers/source';
import { StreamPage } from './stream';
import { SettingsPage } from '../shared/settings';
import { AppNavigation } from '../../components/navigation/app_navigation';

interface LogsPageProps extends RouteComponentProps {
  intl: InjectedIntl;
}

export const LogsPage = injectI18n(({ match, intl }: LogsPageProps) => (
  <Source.Provider sourceId="default">
    <ColumnarPage>
      <DocumentTitle
        title={intl.formatMessage({
          id: 'xpack.logs.homePage.documentTitle',
          defaultMessage: 'Logs',
        })}
      />

      <HelpCenterContent
        feedbackLink="https://discuss.elastic.co/c/logs"
        feedbackLinkText={intl.formatMessage({
          id: 'xpack.infra.logsPage.logsHelpContent.feedbackLinkText',
          defaultMessage: 'Provide feedback for Logs',
        })}
      />

      <AppNavigation>
        <RoutedTabs
          tabs={[
            {
              title: intl.formatMessage({
                id: 'xpack.infra.logs.index.streamTabTitle',
                defaultMessage: 'Stream',
              }),
              path: `${match.path}/stream`,
            },
            {
              title: intl.formatMessage({
                id: 'xpack.infra.logs.index.settingsTabTitle',
                defaultMessage: 'Settings',
              }),
              path: `${match.path}/settings`,
            },
          ]}
        />
      </AppNavigation>

      <Switch>
        <Route path={`${match.path}/stream`} component={StreamPage} />
        <Route path={`${match.path}/settings`} component={SettingsPage} />
      </Switch>
    </ColumnarPage>
  </Source.Provider>
));
