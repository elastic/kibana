/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
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
import { useHomeConfig, useHomeServices, useTelemetryId } from './context';
import { useWebCrawlSchedules } from './hooks/use_web_crawl_schedules';
import { useWebCrawls } from './hooks/use_web_crawls';

export interface WebCrawlsPageContentProps {
  onNavigateHome?: () => void;
}

/** Lists the running crawls and the crawl history, and starts, stops and schedules crawls. */
export const WebCrawlsPage = ({ onNavigateHome }: WebCrawlsPageContentProps) => {
  const { share } = useHomeServices();
  const { solutionNav } = useHomeConfig();
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
  const [crawlToSchedule, setCrawlToSchedule] = useState<WebCrawl | null>(null);

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
    ({ url, maxDepth, maxDocuments }: WebCrawl) => startCrawl({ url, maxDepth, maxDocuments }),
    [startCrawl]
  );
  const closeScheduleModal = () => {
    setCrawlToSchedule(null);
    resetSchedule();
  };

  const errorMessage = listErrorMessage ?? actionErrorMessage;
  const runningCount = crawls.filter(({ status }) => status === 'running').length;

  return (
    <KibanaPageTemplate solutionNav={solutionNav} data-test-subj="elasticsearchHomeWebCrawlsPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.elasticsearchHome.webCrawls.title', {
          defaultMessage: 'Web crawls',
        })}
        description={i18n.translate('xpack.elasticsearchHome.webCrawls.description', {
          defaultMessage:
            'Crawl websites into indices for full-text and semantic search. Crawls of different sites run side by side.',
        })}
        rightSideItems={
          onNavigateHome
            ? [
                <EuiButtonEmpty
                  iconType="chevronSingleLeft"
                  onClick={onNavigateHome}
                  data-test-subj="elasticsearchHomeWebCrawlsBack"
                  data-telemetry-id={getTelemetryId('webCrawls-back')}
                >
                  {i18n.translate('xpack.elasticsearchHome.webCrawls.back', {
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
              data-test-subj="elasticsearchHomeWebCrawlsError"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.elasticsearchHome.webCrawls.crawlsTitle', {
                  defaultMessage: 'Crawls',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {runningCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary" data-test-subj="elasticsearchHomeWebCrawlsRunningCount">
                {i18n.translate('xpack.elasticsearchHome.webCrawls.runningCount', {
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
          onSchedule={setCrawlToSchedule}
          onDelete={handleDelete}
        />
        {canReadSchedules && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.elasticsearchHome.webCrawls.schedulesTitle', {
                  defaultMessage: 'Schedules',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            {schedules.length === 0 ? (
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="elasticsearchHomeWebCrawlsNoSchedules"
              >
                {i18n.translate('xpack.elasticsearchHome.webCrawls.noSchedules', {
                  defaultMessage:
                    'No recurring crawls. Use the schedule action of a crawl to repeat it with a workflow.',
                })}
              </EuiText>
            ) : (
              <EuiFlexGroup
                component="ul"
                direction="column"
                gutterSize="s"
                data-test-subj="elasticsearchHomeWebCrawlsSchedules"
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
                            ? i18n.translate('xpack.elasticsearchHome.webCrawls.scheduleEnabled', {
                                defaultMessage: 'Enabled',
                              })
                            : i18n.translate('xpack.elasticsearchHome.webCrawls.scheduleDisabled', {
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
      {crawlToSchedule && (
        <WebCrawlScheduleModal
          crawl={crawlToSchedule}
          isCreating={isCreatingSchedule}
          errorMessage={scheduleErrorMessage}
          onCancel={closeScheduleModal}
          onConfirm={(request) => createSchedule(request, { onSuccess: closeScheduleModal })}
        />
      )}
    </KibanaPageTemplate>
  );
};
