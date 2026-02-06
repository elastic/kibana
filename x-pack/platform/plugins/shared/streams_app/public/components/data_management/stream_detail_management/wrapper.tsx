/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiTourStep, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { Streams } from '@kbn/streams-schema';
import type { ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamDocCountsFetch } from '../../../hooks/use_streams_doc_counts_fetch';
import { useTimeRange } from '../../../hooks/use_time_range';
import { calculateDataQuality } from '../../../util/calculate_data_quality';
import { FeedbackButton } from '../../feedback_button';
import {
  ClassicStreamBadge,
  DiscoverBadgeButton,
  LifecycleBadge,
  WiredStreamBadge,
} from '../../stream_badges';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { TAB_TO_TOUR_STEP_ID, useStreamsTour } from '../../streams_tour';

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
  const { getStepPropsByStepId } = useStreamsTour();
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

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    canReadFailureStore: Streams.ingest.all.GetResponse.is(definition)
      ? definition.privileges.read_failure_store
      : true,
    numDataPoints: 25,
  });
  const docCountsFetch = getStreamDocCounts(streamId);

  const countResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

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
            <EuiFlexGroup gutterSize="s" alignItems="baseline" wrap direction="column">
              {streamId}
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap gutterSize="m">
                <EuiFlexItem grow={true}>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
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
                      showTooltip={true}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  {Streams.ingest.all.GetResponse.is(definition) && (
                    <DiscoverBadgeButton
                      stream={definition.stream}
                      hasDataStream={
                        Streams.WiredStream.GetResponse.is(definition) ||
                        definition.data_stream_exists
                      }
                      spellOut
                    />
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FeedbackButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => {
          const tourStepId = TAB_TO_TOUR_STEP_ID[tabKey];
          const stepProps = tourStepId ? getStepPropsByStepId(tourStepId) : undefined;

          const wrappedLabel = stepProps ? (
            <EuiTourStep
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
            >
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
