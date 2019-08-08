/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';

import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { Header } from '../../components/header';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { Source } from '../../containers/source';
import { StreamPage } from './stream';
import { SettingsPage } from '../shared/settings';
import { AppNavigation } from '../../components/navigation/app_navigation';

interface LogsPageProps extends RouteComponentProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const LogsPage = injectUICapabilities(
  injectI18n(({ match, intl, uiCapabilities }: LogsPageProps) => (
    <Source.Provider sourceId="default">
      <ColumnarPage>
        <DocumentTitle
          title={intl.formatMessage({
            id: 'xpack.infra.logs.index.documentTitle',
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

        <Header
          breadcrumbs={[
            {
              text: i18n.translate('xpack.infra.header.logsTitle', {
                defaultMessage: 'Logs',
              }),
            },
          ]}
          readOnlyBadge={!uiCapabilities.logs.save}
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
  ))
);
