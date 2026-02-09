/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import React, { useEffect, useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useUnbackedQueriesCount } from '../../hooks/use_unbacked_queries_count';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useInsightsDiscoveryApi } from '../../hooks/use_insights_discovery_api';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../util/errors';
import { FeedbackButton } from '../feedback_button';
import { RedirectTo } from '../redirect_to';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { FeaturesTable } from './components/features_table/features_table';
import { QueriesTable } from './components/queries_table/queries_table';
import { StreamsView } from './components/streams_view/streams_view';
import { InsightsTab } from './components/insights/tab';

const discoveryTabs = ['streams', 'features', 'queries', 'insights'] as const;
type DiscoveryTab = (typeof discoveryTabs)[number];

function isValidDiscoveryTab(value: string): value is DiscoveryTab {
  return discoveryTabs.includes(value as DiscoveryTab);
}

export function SignificantEventsDiscoveryPage() {
  const {
    path: { tab },
    ...currentParams
  } = useStreamsAppParams('/_discovery/{tab}');

  const router = useStreamsAppRouter();
  const { core } = useKibana();
  const aiFeatures = useAIFeatures();
  const { getInsightsDiscoveryTaskStatus } = useInsightsDiscoveryApi(
    aiFeatures?.genAiConnectors.selectedConnector
  );
  const [{ value: insightsTask }, getInsightsTaskStatus] = useAsyncFn(
    getInsightsDiscoveryTaskStatus
  );

  useTaskPolling(insightsTask, getInsightsDiscoveryTaskStatus, getInsightsTaskStatus);

  useEffect(() => {
    getInsightsTaskStatus();
  }, [getInsightsTaskStatus]);

  const previousInsightsTaskStatusRef = useRef<TaskStatus | undefined>(undefined);

  useEffect(() => {
    const previousStatus = previousInsightsTaskStatusRef.current;
    previousInsightsTaskStatusRef.current = insightsTask?.status;

    if (insightsTask?.status === TaskStatus.Failed && previousStatus !== TaskStatus.Failed) {
      core.notifications.toasts.addError(getFormattedError(new Error(insightsTask.error)), {
        title: i18n.translate('xpack.streams.insights.errorTitle', {
          defaultMessage: 'Error generating insights',
        }),
      });
      return;
    }

    if (insightsTask?.status === TaskStatus.Completed && previousStatus === TaskStatus.InProgress) {
      const insightsCount = insightsTask.insights?.length ?? 0;
      const toast = core.notifications.toasts.addSuccess(
        {
          title:
            insightsCount > 0
              ? i18n.translate('xpack.streams.insights.discoveryCompleteToastTitle', {
                  defaultMessage:
                    '{count} {count, plural, one {insight} other {insights}} generated',
                  values: { count: insightsCount },
                })
              : i18n.translate('xpack.streams.insights.discoveryCompleteNoInsightsToastTitle', {
                  defaultMessage: 'Insights discovery complete',
                }),
          text: toMountPoint(
            <EuiButton
              size="s"
              onClick={() => {
                core.notifications.toasts.remove(toast);
                router.push('/_discovery/{tab}', { ...currentParams, path: { tab: 'insights' } });
              }}
            >
              {i18n.translate('xpack.streams.insights.viewInsightsToastAction', {
                defaultMessage: 'View insights',
              })}
            </EuiButton>,
            core
          ),
        },
        { toastLifeTimeMs: 15000 }
      );
    }
  }, [insightsTask, core, router, currentParams]);

  const {
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();
  const { euiTheme } = useEuiTheme();
  const { count: unbackedQueriesCount, refetch } = useUnbackedQueriesCount();

  const isInsightsTaskRunning =
    insightsTask?.status === TaskStatus.InProgress ||
    insightsTask?.status === TaskStatus.BeingCanceled;

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEventsDiscovery.breadcrumbTitle', {
          defaultMessage: 'Significant events Discovery',
        }),
        path: '/_discovery',
      },
    ];
  }, []);

  if (significantEventsDiscovery === undefined) {
    // Waiting to load license
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!significantEventsDiscovery.available || !significantEventsDiscovery.enabled) {
    return <RedirectTo path="/" />;
  }

  if (!isValidDiscoveryTab(tab)) {
    return <RedirectTo path="/_discovery/{tab}" params={{ path: { tab: 'streams' } }} />;
  }

  const tabs = [
    {
      id: 'streams',
      label: i18n.translate('xpack.streams.significantEventsDiscovery.streamsTab', {
        defaultMessage: 'Streams',
      }),
      href: router.link('/_discovery/{tab}', { path: { tab: 'streams' } }),
      isSelected: tab === 'streams',
    },
    {
      id: 'features',
      label: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTab', {
        defaultMessage: 'Features',
      }),
      href: router.link('/_discovery/{tab}', { path: { tab: 'features' } }),
      isSelected: tab === 'features',
    },
    {
      id: 'queries',
      label: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.streams.significantEventsDiscovery.queriesTab', {
              defaultMessage: 'Queries',
            })}
          </EuiFlexItem>
          {unbackedQueriesCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">{unbackedQueriesCount}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
      href: router.link('/_discovery/{tab}', { path: { tab: 'queries' } }),
      isSelected: tab === 'queries',
    },
    {
      id: 'insights',
      label: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.streams.significantEventsDiscovery.insightsTab', {
              defaultMessage: 'Insights',
            })}
          </EuiFlexItem>
          {insightsTask?.status === TaskStatus.Completed &&
            insightsTask.insights &&
            insightsTask.insights.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent">{insightsTask.insights.length}</EuiBadge>
              </EuiFlexItem>
            )}
        </EuiFlexGroup>
      ),
      href: router.link('/_discovery/{tab}', { path: { tab: 'insights' } }),
      isSelected: tab === 'insights',
    },
  ];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.significantEventsDiscovery.pageHeaderTitle', {
                  defaultMessage: 'Significant Events Discovery',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <FeedbackButton />
          </EuiFlexGroup>
        }
        tabs={tabs}
      />
      <StreamsAppPageTemplate.Body grow>
        {tab === 'streams' && (
          <StreamsView
            refreshUnbackedQueriesCount={refetch}
            isInsightsTaskRunning={isInsightsTaskRunning}
            onInsightsTaskScheduled={getInsightsTaskStatus}
          />
        )}
        {tab === 'features' && <FeaturesTable />}
        {tab === 'queries' && <QueriesTable />}
        {tab === 'insights' && (
          <InsightsTab insightsTask={insightsTask} refreshInsightsTask={getInsightsTaskStatus} />
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
