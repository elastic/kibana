/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { HelpCenterContent } from '../../components/help_center_content';
import { AppNavigation } from '../../components/navigation/app_navigation';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { SourceErrorPage } from '../../components/source_error_page';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { useLogAnalysisCapabilitiesContext } from '../../containers/logs/log_analysis';
import { useSourceContext } from '../../containers/source';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { LogEntryCategoriesPage } from './log_entry_categories';
import { LogEntryRatePage } from './log_entry_rate';
import { LogsSettingsPage } from './settings';
import { StreamPage } from './stream';

export const LogsPageContent: React.FunctionComponent<{
  logsPagePath: string;
}> = ({ logsPagePath }) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const source = useSourceContext();
  const logAnalysisCapabilities = useLogAnalysisCapabilitiesContext();

  const streamTab = {
    title: streamTabTitle,
    path: `${logsPagePath}/stream`,
  };

  const logRateTab = {
    title: logRateTabTitle,
    path: `${logsPagePath}/log-rate`,
  };

  const logCategoriesTab = {
    title: logCategoriesTabTitle,
    path: `${logsPagePath}/log-categories`,
  };

  const settingsTab = {
    title: settingsTabTitle,
    path: `${logsPagePath}/settings`,
  };

  return (
    <ColumnarPage>
      <DocumentTitle title={pageTitle} />

      <HelpCenterContent feedbackLink={feedbackLinkUrl} appName={pageTitle} />

      <Header
        breadcrumbs={[
          {
            text: pageTitle,
          },
        ]}
        readOnlyBadge={!uiCapabilities?.logs?.save}
      />
      {source.isLoadingSource ||
      (!source.isLoadingSource && !source.hasFailedLoadingSource && source.source === undefined) ? (
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
            <Route path={settingsTab.path} component={LogsSettingsPage} />
            <RedirectWithQueryParams from={`${logsPagePath}/analysis`} to={logRateTab.path} exact />
          </Switch>
        </>
      )}
    </ColumnarPage>
  );
};

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
