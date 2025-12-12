/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPageHeader, useEuiTheme, EuiFlexItem, EuiTourStep } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
import { Streams } from '@kbn/streams-schema';
import type { ReactNode } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { useStreamsTour, TAB_TO_TOUR_STEP_ID } from '../../streams_tour';
import { calculateDataQuality } from '../../../util/calculate_data_quality';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamDocCountsFetch } from '../../../hooks/use_streams_doc_counts_fetch';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import {
  ClassicStreamBadge,
  DiscoverBadgeButton,
  LifecycleBadge,
  WiredStreamBadge,
} from '../../stream_badges';
import { GroupStreamControls } from './group_stream_controls';
import { FeedbackButton } from '../../feedback_button';

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
}: {
  tabs: ManagementTabs;
  streamId: string;
  tab: string;
}) {
  const router = useStreamsAppRouter();
  const { definition } = useStreamDetail();
  const { services } = useKibana();
  const {
    features: { groupStreams },
  } = useStreamsPrivileges();
  const { getStepPropsByStepId } = useStreamsTour();

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
          }),
          label: currentTab.label,
          content: currentTab.content,
        },
      ];
    })
  );

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    canReadFailureStore: Streams.ingest.all.GetResponse.is(definition)
      ? definition.privileges.read_failure_store
      : true,
  });
  const docCountsFetch = getStreamDocCounts(streamId);

  const countResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  const docCount = countResult?.value ? Number(countResult.value?.values?.[0]?.[0]) : 0;
  const degradedDocCount = degradedDocsResult?.value
    ? Number(degradedDocsResult.value?.values?.[0]?.[0])
    : 0;
  const failedDocCount = failedDocsResult?.value
    ? Number(failedDocsResult.value?.values?.[0]?.[0])
    : 0;

  const quality = calculateDataQuality({
    totalDocs: docCount,
    degradedDocs: degradedDocCount,
    failedDocs: failedDocCount,
  });
  const isQualityLoading =
    countResult?.loading || failedDocsResult?.loading || degradedDocsResult.loading;

  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiPageHeader
        paddingSize="l"
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            alignItems="baseline"
            justifyContent="spaceBetween"
            wrap
          >
            <EuiFlexGroup gutterSize="s" alignItems="baseline" wrap>
              {streamId}
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
                <EuiFlexItem grow={true}>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    {Streams.ingest.all.GetResponse.is(definition) && (
                      <DiscoverBadgeButton definition={definition} />
                    )}
                    {Streams.ClassicStream.GetResponse.is(definition) && <ClassicStreamBadge />}
                    {Streams.WiredStream.GetResponse.is(definition) && <WiredStreamBadge />}
                    {Streams.ingest.all.GetResponse.is(definition) && (
                      <LifecycleBadge
                        lifecycle={definition.effective_lifecycle}
                        dataTestSubj={`lifecycleBadge-${streamId}`}
                      />
                    )}
                    <DatasetQualityIndicator
                      quality={quality}
                      isLoading={isQualityLoading}
                      verbose={true}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>

                {groupStreams?.enabled && Streams.GroupStream.GetResponse.is(definition) && (
                  <GroupStreamControls />
                )}
              </EuiFlexGroup>
            </EuiFlexGroup>
            <FeedbackButton />
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => {
          const tourStepId = TAB_TO_TOUR_STEP_ID[tabKey];
          const stepProps = tourStepId ? getStepPropsByStepId(tourStepId) : undefined;

          const wrappedLabel = stepProps ? (
            <EuiTourStep {...stepProps}>
              <span>{label}</span>
            </EuiTourStep>
          ) : (
            label
          );

          return {
            label: wrappedLabel,
            href,
            isSelected: tab === tabKey,
          };
        })}
      />
      <StreamsAppPageTemplate.Body noPadding={tab === 'partitioning' || tab === 'processing'}>
        {tabs[tab]?.content}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
