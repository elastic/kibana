/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import {
  Streams,
  ROOT_STREAM_NAMES,
  type RootStreamName,
  isDraftGetResponse,
} from '@kbn/streams-schema';
import type { ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';
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
  useDiscoverLink,
} from '../../../stream_badges';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../../../streams_app_page_template';

export type ManagementTabs = Record<
  string,
  {
    content: JSX.Element;
    label: ReactNode;
  }
>;

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
  const { services } = useKibana();
  const { rangeFrom, rangeTo } = useTimeRange();

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

  const tabMap = Object.fromEntries(
    Object.entries(tabs).map(([tabName, currentTab]) => {
      return [
        tabName,
        {
          href: router.link('/{key}/management/{tab}', {
            path: { key: streamId, tab: tabName },
            query: { rangeFrom, rangeTo },
          }),
          label: currentTab.label,
          content: currentTab.content,
        },
      ];
    })
  );

  const isDraft = isDraftGetResponse(definition);

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    getCanReadFailureStore: () =>
      Streams.ingest.all.GetResponse.is(definition)
        ? definition.privileges.read_failure_store
        : false,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
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

  const discoverLink = useDiscoverLink(
    Streams.ingest.all.GetResponse.is(definition)
      ? {
          stream: definition.stream,
          hasDataStream: definition.data_stream_exists || isDraft,
          indexMode: definition.index_mode ?? 'standard',
        }
      : undefined
  );
  const viewInDiscoverLabel = i18n.translate(
    'xpack.streams.entityDetailViewWithoutParams.openInDiscoverBadgeLabel',
    {
      defaultMessage: 'View in Discover',
    }
  );

  const streamBadges: Array<{ key: string; label: string; node: ReactNode }> = [];
  if (Streams.ClassicStream.GetResponse.is(definition)) {
    streamBadges.push({
      key: 'classic',
      label: i18n.translate('xpack.streams.streamDetailHeader.classicBadgeLabel', {
        defaultMessage: 'Classic',
      }),
      node: <ClassicStreamBadge />,
    });
  }

  if (Streams.WiredStream.GetResponse.is(definition)) {
    if (ROOT_STREAM_NAMES.includes(definition.stream.name as RootStreamName)) {
      const technicalPreviewLabel = i18n.translate('xpack.streams.technicalPreviewLabel', {
        defaultMessage: 'Technical preview',
      });
      streamBadges.push({
        key: 'technicalPreview',
        label: technicalPreviewLabel,
        node: (
          <EuiBetaBadge
            tooltipContent={i18n.translate('xpack.streams.technicalPreviewTooltip', {
              defaultMessage: 'This feature is in technical preview. We are working on it...',
            })}
            label={technicalPreviewLabel}
            iconType="flask"
            size="s"
            css={{ display: 'block' }}
          />
        ),
      });
    }
    streamBadges.push({
      key: 'wired',
      label: i18n.translate('xpack.streams.streamDetailHeader.wiredBadgeLabel', {
        defaultMessage: 'Wired',
      }),
      node: <WiredStreamBadge />,
    });
    if (isDraft) {
      streamBadges.push({
        key: 'draft',
        label: i18n.translate('xpack.streams.streamDetailHeader.draftBadgeLabel', {
          defaultMessage: 'Draft',
        }),
        node: <DraftStreamBadge />,
      });
    }
  }
  if (Streams.ingest.all.GetResponse.is(definition) && !isDraft) {
    if (definition.index_mode === 'time_series') {
      streamBadges.push({
        key: 'timeSeries',
        label: i18n.translate('xpack.streams.streamDetailHeader.timeSeriesBadgeLabel', {
          defaultMessage: 'Time series',
        }),
        node: <TimeSeriesBadge />,
      });
    }
    streamBadges.push({
      key: 'lifecycle',
      label: i18n.translate('xpack.streams.streamDetailHeader.lifecycleBadgeLabel', {
        defaultMessage: 'Lifecycle',
      }),
      node: (
        <LifecycleBadge
          lifecycle={definition.effective_lifecycle}
          dataTestSubj={`lifecycleBadge-${streamId}`}
        />
      ),
    });
  }
  if (!isDraft) {
    streamBadges.push({
      key: 'quality',
      label: i18n.translate('xpack.streams.streamDetailHeader.qualityBadgeLabel', {
        defaultMessage: 'Quality',
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

  const appHeaderBadges: AppHeaderBadge[] = streamBadges.map(({ label, node }) => ({
    label,
    renderCustomBadge: () => <>{node}</>,
  }));
  const appHeaderTabs: AppHeaderTab[] = Object.entries(tabMap).map(([tabKey, { label, href }]) => ({
    id: tabKey,
    label,
    href,
    isSelected: tab === tabKey,
  }));
  const appHeaderMenu: AppHeaderMenu | undefined = discoverLink
    ? {
        primaryActionItem: {
          id: 'viewInDiscover',
          label: viewInDiscoverLabel,
          iconType: 'discoverApp',
          href: discoverLink,
          testId: `streamsDiscoverActionButton-${definition.stream.name}`,
        },
      }
    : undefined;
  const streamsBackLabel = i18n.translate('xpack.streams.streamDetailHeader.backToStreamsLabel', {
    defaultMessage: 'Streams',
  });

  return (
    <>
      <StreamsAppHeader
        title={streamId}
        back={{ href: router.link('/'), label: streamsBackLabel }}
        badges={appHeaderBadges}
        tabs={appHeaderTabs}
        menu={appHeaderMenu}
      />
      <StreamsAppPageTemplate.Body noPadding={tab === 'partitioning' || tab === 'processing'}>
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
    </>
  );
}
