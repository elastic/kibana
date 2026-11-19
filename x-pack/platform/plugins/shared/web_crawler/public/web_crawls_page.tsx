/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { WebCrawl } from '../common/types';
import { WebCrawlForm } from './components/web_crawl_form';
import { WebCrawlScheduleModal } from './components/web_crawl_schedule_modal';
import { WebCrawlsTable } from './components/web_crawls_table';
import { useWebCrawlerConfig, useWebCrawlerServices, useTelemetryId } from './context';
import { useWebCrawlSchedules } from './hooks/use_web_crawl_schedules';
import { useWebCrawls } from './hooks/use_web_crawls';

export interface WebCrawlsPageContentProps {
  onNavigateHome?: () => void;
}

/** Lists the running crawls and the crawl history, and starts, stops and schedules crawls. */
export const WebCrawlsPage = ({ onNavigateHome }: WebCrawlsPageContentProps) => {
  const { share } = useWebCrawlerServices();
  const { solutionNav } = useWebCrawlerConfig();
  const getTelemetryId = useTelemetryId();
  const {
    crawls,
    isLoading,
    listErrorMessage,
    startCrawl,
    isStarting,
    startErrorMessage,
    stopCrawl,
    deleteCrawl,
    actionErrorMessage,
    isActing,
  } = useWebCrawls();
  const {
    canRead: canReadSchedules,
    canCreate: canSchedule,
    schedules,
    createSchedule,
    isCreating: isCreatingSchedule,
    createErrorMessage: scheduleErrorMessage,
    resetCreate: resetSchedule,
    getWorkflowUrl,
  } = useWebCrawlSchedules();
  const [scheduleTarget, setScheduleTarget] = useState<WebCrawl | 'new' | null>(null);

  const getIndexUrl = useCallback(
    (indexName: string) =>
      share.url.locators
        .get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID)
        ?.getRedirectUrl({ page: 'index_details', indexName }),
    [share]
  );
  const handleStop = useCallback(({ id }: WebCrawl) => stopCrawl(id), [stopCrawl]);
  const handleDelete = useCallback(({ id }: WebCrawl) => deleteCrawl(id), [deleteCrawl]);
  const handleCrawlAgain = useCallback(
    ({
      url,
      maxDepth,
      maxDocuments,
      includePaths,
      excludePaths,
      indexName,
      seedUrls,
      sitemapUrls,
    }: WebCrawl) =>
      startCrawl({
        url,
        maxDepth,
        maxDocuments,
        includePaths,
        excludePaths,
        indexName,
        seedUrls,
        sitemapUrls,
      }),
    [startCrawl]
  );
  const closeScheduleModal = () => {
    setScheduleTarget(null);
    resetSchedule();
  };

  const errorMessage = listErrorMessage ?? actionErrorMessage;
  const runningCount = crawls.filter(({ status }) => status === 'running').length;

  return (
    <KibanaPageTemplate solutionNav={solutionNav} data-test-subj="webCrawlsPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.webCrawler.crawls.title', {
          defaultMessage: 'Web crawls',
        })}
        description={i18n.translate('xpack.webCrawler.crawls.description', {
          defaultMessage:
            'Crawl websites into indices for full-text and semantic search. Crawls of different sites run side by side.',
        })}
        rightSideItems={
          onNavigateHome
            ? [
                <EuiButtonEmpty
                  iconType="chevronSingleLeft"
                  onClick={onNavigateHome}
                  data-test-subj="webCrawlsBack"
                  data-telemetry-id={getTelemetryId('webCrawls-back')}
                >
                  {i18n.translate('xpack.webCrawler.crawls.back', {
                    defaultMessage: 'Back to home',
                  })}
                </EuiButtonEmpty>,
              ]
            : undefined
        }
      />
      <KibanaPageTemplate.Section>
        <EuiPanel hasBorder paddingSize="m">
          <WebCrawlForm
            onSubmit={startCrawl}
            isStarting={isStarting}
            errorMessage={startErrorMessage}
          />
        </EuiPanel>
        <EuiSpacer size="l" />
        {errorMessage && (
          <>
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={errorMessage}
              data-test-subj="webCrawlsError"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.webCrawler.crawls.crawlsTitle', {
                  defaultMessage: 'Crawls',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {runningCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary" data-test-subj="webCrawlsRunningCount">
                {i18n.translate('xpack.webCrawler.crawls.runningCount', {
                  defaultMessage: '{runningCount} running',
                  values: { runningCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <WebCrawlsTable
          crawls={crawls}
          isLoading={isLoading}
          canSchedule={canSchedule}
          isActing={isActing}
          getIndexUrl={getIndexUrl}
          getWorkflowUrl={getWorkflowUrl}
          onStop={handleStop}
          onCrawlAgain={handleCrawlAgain}
          onSchedule={setScheduleTarget}
          onDelete={handleDelete}
        />
        {canReadSchedules && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate('xpack.webCrawler.crawls.schedulesTitle', {
                      defaultMessage: 'Schedules',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              {canSchedule && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="calendar"
                    onClick={() => setScheduleTarget('new')}
                    data-test-subj="webCrawlsNewSchedule"
                    data-telemetry-id={getTelemetryId('webCrawls-newSchedule')}
                  >
                    {i18n.translate('xpack.webCrawler.crawls.newSchedule', {
                      defaultMessage: 'Schedule a crawl',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {schedules.length === 0 ? (
              <EuiText size="s" color="subdued" data-test-subj="webCrawlsNoSchedules">
                {i18n.translate('xpack.webCrawler.crawls.noSchedules', {
                  defaultMessage:
                    'No recurring crawls. Schedule one here, or use the schedule action of a crawl to repeat it.',
                })}
              </EuiText>
            ) : (
              <EuiFlexGroup
                component="ul"
                direction="column"
                gutterSize="s"
                data-test-subj="webCrawlsSchedules"
              >
                {schedules.map(({ workflowId, name, enabled }) => (
                  <EuiFlexItem component="li" key={workflowId}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiLink
                          href={getWorkflowUrl(workflowId)}
                          data-telemetry-id={getTelemetryId('webCrawls-openWorkflow')}
                        >
                          {name}
                        </EuiLink>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={enabled ? 'success' : 'hollow'}>
                          {enabled
                            ? i18n.translate('xpack.webCrawler.crawls.scheduleEnabled', {
                                defaultMessage: 'Enabled',
                              })
                            : i18n.translate('xpack.webCrawler.crawls.scheduleDisabled', {
                                defaultMessage: 'Disabled',
                              })}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </>
        )}
      </KibanaPageTemplate.Section>
      {scheduleTarget && (
        <WebCrawlScheduleModal
          crawl={scheduleTarget === 'new' ? undefined : scheduleTarget}
          isCreating={isCreatingSchedule}
          errorMessage={scheduleErrorMessage}
          onCancel={closeScheduleModal}
          onConfirm={(request) => createSchedule(request, { onSuccess: closeScheduleModal })}
        />
      )}
    </KibanaPageTemplate>
  );
};
