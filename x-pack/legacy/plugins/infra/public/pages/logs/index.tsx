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
import { Header } from '../../components/header';
import { RoutedTabs, TabBetaBadge } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { SourceErrorPage } from '../../components/source_error_page';
import { Source, useSource } from '../../containers/source';
import { StreamPage } from './stream';
import { SettingsPage } from '../shared/settings';
import { AppNavigation } from '../../components/navigation/app_navigation';
import {
  useLogAnalysisCapabilities,
  LogAnalysisCapabilities,
} from '../../containers/logs/log_analysis';
import { useSourceId } from '../../containers/source_id';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { LogEntryCategoriesPage } from './log_entry_categories';
import { LogEntryRatePage } from './log_entry_rate';

interface LogsPageProps extends RouteComponentProps {
  uiCapabilities: UICapabilities;
}

export const LogsPage = injectUICapabilities(({ match, uiCapabilities }: LogsPageProps) => {
  const [sourceId] = useSourceId();
  const source = useSource({ sourceId });
  const logAnalysisCapabilities = useLogAnalysisCapabilities();

  const streamTab = {
    title: streamTabTitle,
    path: `${match.path}/stream`,
  };

  const logRateTab = {
    title: (
      <>
        {logRateTabTitle}
        <TabBetaBadge title={logRateTabTitle} />
      </>
    ),
    path: `${match.path}/log-rate`,
  };

  const logCategoriesTab = {
    title: (
      <>
        {logCategoriesTabTitle}
        <TabBetaBadge title={logCategoriesTabTitle} />
      </>
    ),
    path: `${match.path}/log-categories`,
  };

  const settingsTab = {
    title: settingsTabTitle,
    path: `${match.path}/settings`,
  };

  return (
    <Source.Context.Provider value={source}>
      <LogAnalysisCapabilities.Context.Provider value={logAnalysisCapabilities}>
        <ColumnarPage>
          <DocumentTitle title={pageTitle} />

          <HelpCenterContent feedbackLink={feedbackLinkUrl} appName={pageTitle} />

          <Header
            breadcrumbs={[
              {
                text: pageTitle,
              },
            ]}
            readOnlyBadge={!uiCapabilities.logs.save}
          />
          {source.isLoadingSource ||
          (!source.isLoadingSource &&
            !source.hasFailedLoadingSource &&
            source.source === undefined) ? (
            <SourceLoadingPage />
          ) : source.hasFailedLoadingSource ? (
            <SourceErrorPage
              errorMessage={source.loadSourceFailureMessage || ''}
              retry={source.loadSource}
            />
          ) : (
            <>
              <AppNavigation aria-label={pageTitle}>
                <RoutedTabs
                  tabs={
                    logAnalysisCapabilities.hasLogAnalysisCapabilites
                      ? [streamTab, logRateTab, logCategoriesTab, settingsTab]
                      : [streamTab, settingsTab]
                  }
                />
              </AppNavigation>

              <Switch>
                <Route path={streamTab.path} component={StreamPage} />
                <Route path={logRateTab.path} component={LogEntryRatePage} />
                <Route path={logCategoriesTab.path} component={LogEntryCategoriesPage} />
                <Route path={settingsTab.path} component={SettingsPage} />
                <RedirectWithQueryParams
                  from={`${match.path}/analysis`}
                  to={logRateTab.path}
                  exact
                />
              </Switch>
            </>
          )}
        </ColumnarPage>
      </LogAnalysisCapabilities.Context.Provider>
    </Source.Context.Provider>
  );
});

const pageTitle = i18n.translate('xpack.infra.header.logsTitle', {
  defaultMessage: 'Logs',
});

const streamTabTitle = i18n.translate('xpack.infra.logs.index.streamTabTitle', {
  defaultMessage: 'Stream',
});

const logRateTabTitle = i18n.translate('xpack.infra.logs.index.logRateBetaBadgeTitle', {
  defaultMessage: 'Log Rate',
});

const logCategoriesTabTitle = i18n.translate('xpack.infra.logs.index.logCategoriesBetaBadgeTitle', {
  defaultMessage: 'Categories',
});

const settingsTabTitle = i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
  defaultMessage: 'Settings',
});

const feedbackLinkUrl = 'https://discuss.elastic.co/c/logs';
