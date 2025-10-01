/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiPageHeader,
  useEuiTheme,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import type { ReactNode } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { calculateDataQuality } from '../../../util/calculate_data_quality';
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
  const {
    features: { groupStreams },
  } = useStreamsPrivileges();

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
        breadcrumbs={[
          {
            href: router.link('/'),
            text: (
              <EuiButtonEmpty
                iconType="arrowLeft"
                size="s"
                flush="left"
                aria-label={i18n.translate(
                  'xpack.streams.entityDetailViewWithoutParams.breadcrumb',
                  {
                    defaultMessage: 'Back to Streams',
                  }
                )}
              >
                {i18n.translate('xpack.streams.entityDetailViewWithoutParams.breadcrumb', {
                  defaultMessage: 'Streams',
                })}
              </EuiButtonEmpty>
            ),
          },
        ]}
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
          >
            <EuiFlexGroup gutterSize="s" alignItems="baseline">
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
                      <LifecycleBadge lifecycle={definition.effective_lifecycle} />
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
        tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => ({
          label,
          href,
          isSelected: tab === tabKey,
        }))}
      />
      <StreamsAppPageTemplate.Body noPadding={tab === 'partitioning' || tab === 'processing'}>
        {tabs[tab]?.content}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
