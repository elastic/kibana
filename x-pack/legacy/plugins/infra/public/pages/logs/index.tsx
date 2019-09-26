/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiBetaBadge } from '@elastic/eui';
import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';

import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { Header } from '../../components/header';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { SourceErrorPage } from '../../components/source_error_page';
import { Source, useSource } from '../../containers/source';
import { StreamPage } from './stream';
import { SettingsPage } from '../shared/settings';
import { AppNavigation } from '../../components/navigation/app_navigation';
import { AnalysisPage } from './analysis';
import {
  useLogAnalysisCapabilities,
  LogAnalysisCapabilities,
} from '../../containers/logs/log_analysis';
import { useSourceId } from '../../containers/source_id';

interface LogsPageProps extends RouteComponentProps {
  uiCapabilities: UICapabilities;
}

export const LogsPage = injectUICapabilities(({ match, uiCapabilities }: LogsPageProps) => {
  const [sourceId] = useSourceId();
  const source = useSource({ sourceId });
  const logAnalysisCapabilities = useLogAnalysisCapabilities();

  const streamTab = {
    title: i18n.translate('xpack.infra.logs.index.streamTabTitle', { defaultMessage: 'Stream' }),
    path: `${match.path}/stream`,
  };
  const analysisBetaBadgeTitle = i18n.translate('xpack.infra.logs.index.analysisBetaBadgeTitle', {
    defaultMessage: 'Analysis',
  });
  const analysisBetaBadgeLabel = i18n.translate('xpack.infra.logs.index.analysisBetaBadgeLabel', {
    defaultMessage: 'Beta',
  });
  const analysisBetaBadgeTooltipContent = i18n.translate(
    'xpack.infra.logs.index.analysisBetaBadgeTooltipContent',
    {
      defaultMessage:
        'This feature is under active development. Extra functionality is coming, and some functionality may change.',
    }
  );
  const analysisBetaBadge = (
    <EuiBetaBadge
      label={analysisBetaBadgeLabel}
      aria-label={analysisBetaBadgeLabel}
      title={analysisBetaBadgeTitle}
      tooltipContent={analysisBetaBadgeTooltipContent}
    />
  );
  const analysisTab = {
    title: (
      <>
        <span
          style={{
            display: 'inline-block',
            position: 'relative',
            top: '-4px',
            marginRight: '5px',
          }}
        >
          {i18n.translate('xpack.infra.logs.index.analysisTabTitle', {
            defaultMessage: 'Analysis',
          })}
        </span>
        {analysisBetaBadge}
      </>
    ),
    path: `${match.path}/analysis`,
  };
  const settingsTab = {
    title: i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
      defaultMessage: 'Settings',
    }),
    path: `${match.path}/settings`,
  };
  return (
    <Source.Context.Provider value={source}>
      <LogAnalysisCapabilities.Context.Provider value={logAnalysisCapabilities}>
        <ColumnarPage>
          <DocumentTitle
            title={i18n.translate('xpack.infra.logs.index.documentTitle', {
              defaultMessage: 'Logs',
            })}
          />

          <HelpCenterContent
            feedbackLink="https://discuss.elastic.co/c/logs"
            feedbackLinkText={i18n.translate(
              'xpack.infra.logsPage.logsHelpContent.feedbackLinkText',
              { defaultMessage: 'Provide feedback for Logs' }
            )}
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
              <AppNavigation>
                <RoutedTabs
                  tabs={
                    logAnalysisCapabilities.hasLogAnalysisCapabilites
                      ? [streamTab, analysisTab, settingsTab]
                      : [streamTab, settingsTab]
                  }
                />
              </AppNavigation>

              <Switch>
                <Route path={`${match.path}/stream`} component={StreamPage} />
                <Route path={`${match.path}/analysis`} component={AnalysisPage} />
                <Route path={`${match.path}/settings`} component={SettingsPage} />
              </Switch>
            </>
          )}
        </ColumnarPage>
      </LogAnalysisCapabilities.Context.Provider>
    </Source.Context.Provider>
  );
});
