/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';

import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { Header } from '../../components/header';
import { MetricsExplorerOptionsContainer } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { WithSource } from '../../containers/with_source';
import { Source } from '../../containers/source';
import { MetricsExplorerPage } from './metrics_explorer';
import { SnapshotPage } from './snapshot';
import { SettingsPage } from '../shared/settings';
import { AppNavigation } from '../../components/navigation/app_navigation';

interface InfrastructurePageProps extends RouteComponentProps {
  uiCapabilities: UICapabilities;
}

export const InfrastructurePage = injectUICapabilities(
  ({ match, uiCapabilities }: InfrastructurePageProps) => (
    <Source.Provider sourceId="default">
      <ColumnarPage>
        <DocumentTitle
          title={i18n.translate('xpack.infra.homePage.documentTitle', {
            defaultMessage: 'Infrastructure',
          })}
        />

        <HelpCenterContent
          feedbackLink="https://discuss.elastic.co/c/infrastructure"
          feedbackLinkText={i18n.translate(
            'xpack.infra.infrastructure.infrastructureHelpContent.feedbackLinkText',
            { defaultMessage: 'Provide feedback for Infrastructure' }
          )}
        />

        <Header
          breadcrumbs={[
            {
              text: i18n.translate('xpack.infra.header.infrastructureTitle', {
                defaultMessage: 'Infrastructure',
              }),
            },
          ]}
          readOnlyBadge={!uiCapabilities.infrastructure.save}
        />

        <AppNavigation>
          <RoutedTabs
            tabs={[
              {
                title: i18n.translate('xpack.infra.homePage.inventoryTabTitle', {
                  defaultMessage: 'Inventory',
                }),
                path: `${match.path}/inventory`,
              },
              {
                title: i18n.translate('xpack.infra.homePage.metricsExplorerTabTitle', {
                  defaultMessage: 'Metrics Explorer',
                }),
                path: `${match.path}/metrics-explorer`,
              },
              {
                title: i18n.translate('xpack.infra.homePage.settingsTabTitle', {
                  defaultMessage: 'Settings',
                }),
                path: `${match.path}/settings`,
              },
            ]}
          />
        </AppNavigation>

        <Switch>
          <Route path={`${match.path}/inventory`} component={SnapshotPage} />
          <Route
            path={`${match.path}/metrics-explorer`}
            render={props => (
              <WithSource>
                {({ configuration, createDerivedIndexPattern }) => (
                  <MetricsExplorerOptionsContainer.Provider>
                    <WithMetricsExplorerOptionsUrlState />
                    <MetricsExplorerPage
                      derivedIndexPattern={createDerivedIndexPattern('metrics')}
                      source={configuration}
                      {...props}
                    />
                  </MetricsExplorerOptionsContainer.Provider>
                )}
              </WithSource>
            )}
          />
          <Route path={`${match.path}/settings`} component={SettingsPage} />
        </Switch>
      </ColumnarPage>
    </Source.Provider>
  )
);
