/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

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
import { MetricsSettingsPage } from './settings';
import { AppNavigation } from '../../components/navigation/app_navigation';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export const InfrastructurePage = ({ match }: RouteComponentProps) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  return (
    <Source.Provider sourceId="default">
      <ColumnarPage>
        <DocumentTitle
          title={i18n.translate('xpack.infra.homePage.documentTitle', {
            defaultMessage: 'Metrics',
          })}
        />

        <HelpCenterContent
          feedbackLink="https://discuss.elastic.co/c/metrics"
          appName={i18n.translate('xpack.infra.header.infrastructureHelpAppName', {
            defaultMessage: 'Metrics',
          })}
        />

        <Header
          breadcrumbs={[
            {
              text: i18n.translate('xpack.infra.header.infrastructureTitle', {
                defaultMessage: 'Metrics',
              }),
            },
          ]}
          readOnlyBadge={!uiCapabilities?.infrastructure?.save}
        />

        <AppNavigation
          aria-label={i18n.translate('xpack.infra.header.infrastructureNavigationTitle', {
            defaultMessage: 'Metrics',
          })}
        >
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
                    {configuration ? (
                      <MetricsExplorerPage
                        derivedIndexPattern={createDerivedIndexPattern('metrics')}
                        source={configuration}
                        {...props}
                      />
                    ) : (
                      <SourceLoadingPage />
                    )}
                  </MetricsExplorerOptionsContainer.Provider>
                )}
              </WithSource>
            )}
          />
          <Route path={`${match.path}/settings`} component={MetricsSettingsPage} />
        </Switch>
      </ColumnarPage>
    </Source.Provider>
  );
};
