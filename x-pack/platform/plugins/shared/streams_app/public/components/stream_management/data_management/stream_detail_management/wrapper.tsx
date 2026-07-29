/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiCallOut, EuiSpacer, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import type {
  AppHeaderBadge,
  AppHeaderMenu,
  AppHeaderTab,
  AppHeaderTabActions,
} from '@kbn/app-header';
import { useAbortController } from '@kbn/react-hooks';
import {
  Streams,
  LOGS_ROOT_STREAM_NAME,
  ROOT_STREAM_NAMES,
  type RootStreamName,
  isDraftGetResponse,
  isRoot,
} from '@kbn/streams-schema';
import type { ReactElement, ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamDetail } from '../../../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import {
  STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  useStreamDocCountsFetch,
} from '../../../../hooks/use_streams_doc_counts_fetch';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { calculateDataQuality } from '../../../../util/calculate_data_quality';
import {
  ClassicStreamBadge,
  DraftStreamBadge,
  LifecycleBadge,
  TimeSeriesBadge,
  WiredStreamBadge,
  useDiscoverStreamLink,
} from '../../../stream_badges';
import { StreamDeleteModal } from '../../../stream_delete_modal';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../../../streams_app_page_template';
import { TAB_TO_TOUR_STEP_ID, useStreamsTour } from '../../../streams_tour';

export interface ManagementTab {
  content: JSX.Element;
  label: string;
  toolTipContent?: string;
  'data-test-subj'?: string;
  actions?: AppHeaderTabActions;
}

export type ManagementTabs = Record<string, ManagementTab>;

const getTabTestSubj = (tabName: string, tab: ManagementTab) =>
  tab['data-test-subj'] ?? `streamsAppManagementTab-${tabName}`;

export function Wrapper({
  tabs,
  streamId,
  tab,
  topContent,
}: {
  tabs: ManagementTabs;
  streamId: string;
  tab: string;
  topContent?: ReactNode;
}) {
  const router = useStreamsAppRouter();
  const { definition } = useStreamDetail();
  const {
    core: {
      application: { navigateToApp },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    services,
  } = useKibana();
  const { getStepPropsByStepId } = useStreamsTour();
  const { rangeFrom, rangeTo } = useTimeRange();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const abortController = useAbortController();

  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    // only track for ingest streams (wired and classic) which have privileges
    if (!definition || !Streams.ingest.all.GetResponse.is(definition)) {
      return;
    }

    // avoid duplicate tracking for the same stream and tab
    const trackingKey = `${definition.stream.name}-${tab}`;
    if (lastTrackedRef.current === trackingKey) {
      return;
    }

    lastTrackedRef.current = trackingKey;

    const streamType = Streams.WiredStream.GetResponse.is(definition) ? 'wired' : 'classic';

    services.telemetryClient.trackTabVisited({
      stream_name: definition.stream.name,
      stream_type: streamType,
      tab_name: tab,
      privileges: definition.privileges,
    });
  }, [definition, tab, services.telemetryClient]);

  const isDraft = isDraftGetResponse(definition);

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    getCanReadFailureStore: () =>
      Streams.ingest.all.GetResponse.is(definition)
        ? definition.privileges.read_failure_store
        : false,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
    // Detail view never renders the Ingestion column, so skip the unused ingestion request.
    fetchIngestionDocCounts: false,
  });

  // Draft streams have no backing data stream so doc_counts endpoints return 404.
  const docCountsFetch = isDraft ? undefined : getStreamDocCounts(streamId);

  const countResult = useAsync(
    () => docCountsFetch?.docCount ?? Promise.resolve([]),
    [docCountsFetch]
  );
  const failedDocsResult = useAsync(
    () => docCountsFetch?.failedDocCount ?? Promise.resolve([]),
    [docCountsFetch]
  );
  const degradedDocsResult = useAsync(
    () => docCountsFetch?.degradedDocCount ?? Promise.resolve([]),
    [docCountsFetch]
  );

  const docCount = countResult?.value?.find((stat) => stat.stream === streamId)?.count ?? 0;
  const degradedDocCount =
    degradedDocsResult?.value?.find((stat) => stat.stream === streamId)?.count ?? 0;
  const failedDocCount =
    failedDocsResult?.value?.find((stat) => stat.stream === streamId)?.count ?? 0;

  const quality = calculateDataQuality({
    totalDocs: docCount,
    degradedDocs: degradedDocCount,
    failedDocs: failedDocCount,
  });
  const isQualityLoading =
    countResult?.loading || failedDocsResult?.loading || degradedDocsResult.loading;

  // Badges are ordered by relevance (per design): "Technical preview" stays pinned first, then data
  // quality (kept visible before the overflow popover), then retention, then the stream type/mode
  // badges. The stream type (classic/wired) is the least important and is expected to be phased out.
  const streamBadges: Array<{ label: string; node: ReactElement }> = [];
  if (
    Streams.WiredStream.GetResponse.is(definition) &&
    ROOT_STREAM_NAMES.includes(definition.stream.name as RootStreamName)
  ) {
    streamBadges.push({
      label: i18n.translate('xpack.streams.technicalPreviewLabel', {
        defaultMessage: 'Technical preview',
      }),
      node: (
        <EuiBetaBadge
          tooltipContent={i18n.translate('xpack.streams.technicalPreviewTooltip', {
            defaultMessage: 'This feature is in technical preview. We are working on it...',
          })}
          label={i18n.translate('xpack.streams.technicalPreviewLabel', {
            defaultMessage: 'Technical preview',
          })}
          iconType="flask"
          size="s"
          css={{ display: 'block' }}
        />
      ),
    });
  }
  if (!isDraft) {
    streamBadges.push({
      label: i18n.translate('xpack.streams.streamDetailView.qualityTab', {
        defaultMessage: 'Data quality',
      }),
      node: (
        <DatasetQualityIndicator
          quality={quality}
          isLoading={isQualityLoading}
          verbose={true}
          showTooltip={true}
        />
      ),
    });
  }
  if (Streams.ingest.all.GetResponse.is(definition) && !isDraft) {
    streamBadges.push({
      label: i18n.translate('xpack.streams.badges.lifecycle.title', {
        defaultMessage: 'Data Retention',
      }),
      node: (
        <LifecycleBadge
          lifecycle={definition.effective_lifecycle}
          dataTestSubj={`lifecycleBadge-${streamId}`}
        />
      ),
    });
    if (definition.index_mode === 'time_series') {
      streamBadges.push({
        label: i18n.translate('xpack.streams.badges.timeSeries.label', {
          defaultMessage: 'Time series',
        }),
        node: <TimeSeriesBadge />,
      });
    }
  }
  if (Streams.ClassicStream.GetResponse.is(definition)) {
    streamBadges.push({
      label: i18n.translate('xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel', {
        defaultMessage: 'Classic',
      }),
      node: <ClassicStreamBadge />,
    });
  }

  if (Streams.WiredStream.GetResponse.is(definition)) {
    streamBadges.push({
      label: i18n.translate('xpack.streams.entityDetailViewWithoutParams.managedBadgeLabel', {
        defaultMessage: 'Wired',
      }),
      node: <WiredStreamBadge />,
    });
    if (isDraft) {
      streamBadges.push({
        label: i18n.translate('xpack.streams.entityDetailViewWithoutParams.draftBadgeLabel', {
          defaultMessage: 'Draft',
        }),
        node: <DraftStreamBadge />,
      });
    }
  }

  const appHeaderBadges: AppHeaderBadge[] = streamBadges.map(({ label, node }) => ({
    label,
    renderCustomBadge: () => node,
  }));

  const canDeleteStream =
    (Streams.ClassicStream.GetResponse.is(definition) &&
      definition.privileges.manage &&
      !definition.replicated) ||
    (Streams.WiredStream.GetResponse.is(definition) &&
      definition.privileges.manage &&
      (!isRoot(definition.stream.name) || definition.stream.name === LOGS_ROOT_STREAM_NAME));

  const discoverHref = useDiscoverStreamLink(
    Streams.ingest.all.GetResponse.is(definition)
      ? {
          stream: definition.stream,
          hasDataStream: definition.data_stream_exists || isDraft,
          indexMode: definition.index_mode ?? 'standard',
        }
      : {}
  );

  const deleteStream = useCallback(async () => {
    if (!Streams.ingest.all.GetResponse.is(definition)) {
      return;
    }
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: definition.stream.name } },
      signal: abortController.signal,
    });
    navigateToApp('/streams');
  }, [definition, abortController.signal, navigateToApp, streamsRepositoryClient]);

  const backToStreamsLabel = i18n.translate('xpack.streams.streamDetailView.backToStreamsLabel', {
    defaultMessage: 'Streams',
  });
  const viewInDiscoverLabel = i18n.translate('xpack.streams.streamDetailView.viewInDiscoverLabel', {
    defaultMessage: 'View in Discover',
  });
  const deleteStreamLabel = i18n.translate(
    'xpack.streams.streamDetailActionsMenu.deleteStreamLabel',
    { defaultMessage: 'Delete stream' }
  );

  const appHeaderMenu = useMemo<AppHeaderMenu | undefined>(() => {
    if (!Streams.ingest.all.GetResponse.is(definition)) {
      return undefined;
    }

    const items: NonNullable<AppHeaderMenu['items']> = [];
    if (canDeleteStream) {
      items.push({
        id: 'delete',
        order: 1,
        label: deleteStreamLabel,
        iconType: 'trash',
        overflow: true,
        isDestructive: true,
        testId: 'streamsDeleteStreamButton',
        run: () => setShowDeleteModal(true),
      });
    }

    const primaryActionItem = discoverHref
      ? {
          id: 'discover',
          label: viewInDiscoverLabel,
          iconType: 'discoverApp',
          href: discoverHref,
          testId: `streamsDiscoverActionButton-${definition.stream.name}`,
        }
      : undefined;

    if (!primaryActionItem && items.length === 0) {
      return undefined;
    }

    return {
      ...(primaryActionItem ? { primaryActionItem } : {}),
      ...(items.length ? { items } : {}),
    };
  }, [definition, canDeleteStream, discoverHref, deleteStreamLabel, viewInDiscoverLabel]);

  const appHeaderTabs: AppHeaderTab[] = Object.entries(tabs).map(([tabName, currentTab]) => ({
    id: tabName,
    label: currentTab.label,
    href: router.link('/{key}/management/{tab}', {
      path: { key: streamId, tab: tabName },
      query: { rangeFrom, rangeTo },
    }),
    isSelected: tab === tabName,
    'data-test-subj': getTabTestSubj(tabName, currentTab),
    toolTipContent: currentTab.toolTipContent,
    actions: currentTab.actions,
  }));

  return (
    <>
      <StreamsAppHeader
        title={streamId}
        back={{ href: router.link('/'), label: backToStreamsLabel }}
        badges={appHeaderBadges}
        tabs={appHeaderTabs}
        menu={appHeaderMenu}
      />
      {Object.keys(tabs).map((tabName) => {
        const tourStepId = TAB_TO_TOUR_STEP_ID[tabName];
        const stepProps = tourStepId ? getStepPropsByStepId(tourStepId) : undefined;

        if (!stepProps) {
          return null;
        }

        return (
          <EuiTourStep
            key={tabName}
            step={stepProps.step}
            stepsTotal={stepProps.stepsTotal}
            title={stepProps.title}
            subtitle={stepProps.subtitle}
            content={stepProps.content}
            anchorPosition={stepProps.anchorPosition}
            offset={stepProps.offset}
            maxWidth={stepProps.maxWidth}
            isStepOpen={stepProps.isStepOpen}
            footerAction={stepProps.footerAction}
            onFinish={stepProps.onFinish}
            anchor={`[data-test-subj="${getTabTestSubj(tabName, tabs[tabName])}"]`}
          />
        );
      })}
      <StreamsAppPageTemplate.Body
        noPadding={tab === 'partitioning' || tab === 'processing' || tab === 'canvas'}
        paddingSize="m"
      >
        {topContent}
        {Streams.ingest.all.GetResponse.is(definition) && definition.replicated && (
          <>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.translate('xpack.streams.replicated.callout.title', {
                defaultMessage: 'Replicated stream',
              })}
              color="warning"
              iconType="warning"
            >
              {i18n.translate('xpack.streams.replicated.callout.body', {
                defaultMessage:
                  'This stream is replicated from a remote cluster via cross-cluster replication. Write operations are not available.',
              })}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {tabs[tab]?.content}
      </StreamsAppPageTemplate.Body>
      {showDeleteModal && Streams.ingest.all.GetResponse.is(definition) && (
        <StreamDeleteModal
          name={definition.stream.name}
          onClose={() => setShowDeleteModal(false)}
          onCancel={() => setShowDeleteModal(false)}
          onDelete={deleteStream}
        />
      )}
    </>
  );
}
