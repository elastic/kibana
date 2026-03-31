/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  formatNumber,
} from '@elastic/eui';
import { calculatePercentage, DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { useKibana } from '../../hooks/use_kibana';
import { executeEsqlQuery } from '../../hooks/use_execute_esql_query';
import { calculateDataQuality } from '../../util/calculate_data_quality';
import {
  buildDataQualityDegradedDocCountEsql,
  buildDataQualityIgnoredFieldsCountEsql,
  buildDataQualityTotalDocCountEsql,
} from '../../util/stream_overview_esql';
import { OverviewStat } from './overview_stat';

function FailedDocsNoPrivilege() {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <span>{'—'}</span>
      <EuiToolTip
        content={i18n.translate(
          'xpack.streams.streamOverview.dataQualityCard.failedDocsNoPrivilege',
          { defaultMessage: 'You do not have the required privilege to view failure store data.' }
        )}
      >
        <EuiButtonIcon
          iconType="warning"
          color="text"
          size="xs"
          href="https://www.elastic.co/docs/manage-data/data-store/data-streams/failure-store"
          target="_blank"
          aria-label={i18n.translate(
            'xpack.streams.streamOverview.dataQualityCard.failedDocsNoPrivilegeAriaLabel',
            { defaultMessage: 'Insufficient privilege — learn more about failure store' }
          )}
        />
      </EuiToolTip>
    </EuiFlexGroup>
  );
}

export function DataQualityCard() {
  const { definition } = useStreamDetail();

  if (!Streams.ingest.all.GetResponse.is(definition)) {
    return null;
  }

  return <DataQualityCardContent definition={definition} />;
}

function DataQualityCardContent({ definition }: { definition: Streams.ingest.all.GetResponse }) {
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    dependencies: {
      start: {
        data,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const canReadFailureStore = definition.privileges.read_failure_store;
  const streamName = definition.stream.name;

  const dataSourceForTimeRange = canReadFailureStore
    ? `${streamName},${streamName}::failures`
    : streamName;

  // Total docs: simple COUNT(*) over the selected time range.
  // Includes ::failures when the user has read_failure_store privilege
  const totalDocsResult = useStreamsAppFetch(
    async ({ signal, timeState: ts }) => {
      if (!ts) return 0;
      const response = await executeEsqlQuery({
        query: buildDataQualityTotalDocCountEsql(dataSourceForTimeRange),
        search: data.search.search,
        signal,
        start: ts.start,
        end: ts.end,
      });
      const colIdx = response.columns.findIndex((c) => c.name === 'doc_count');
      return colIdx !== -1 ? (response.values[0]?.[colIdx] as number) ?? 0 : 0;
    },
    [dataSourceForTimeRange, data.search.search],
    { withTimeRange: true, withRefresh: true }
  );

  // Degraded docs: documents with at least one ignored field (_ignored) in the same time range
  // and data sources as total docs. (The degraded REST API is not time-filtered and only hits
  // the latest backing index — mixing it with a time-filtered total produced >100% percentages.)
  const degradedDocsResult = useStreamsAppFetch(
    async ({ signal, timeState: ts }) => {
      if (!ts) return 0;
      const response = await executeEsqlQuery({
        query: buildDataQualityDegradedDocCountEsql(dataSourceForTimeRange),
        search: data.search.search,
        signal,
        start: ts.start,
        end: ts.end,
      });
      const colIdx = response.columns.findIndex((c) => c.name === 'degraded_doc_count');
      return colIdx !== -1 ? (response.values[0]?.[colIdx] as number) ?? 0 : 0;
    },
    [dataSourceForTimeRange, data.search.search],
    { withTimeRange: true, withRefresh: true }
  );

  // Failed docs: documents routed to the failure store (time-filtered).
  // Only fetched when the user has read_failure_store privilege.
  const failedDocsResult = useStreamsAppFetch(
    async ({ signal, timeState: ts }) => {
      if (!canReadFailureStore) return 0;
      if (!ts) return 0;
      const result = await streamsRepositoryClient.fetch(
        'GET /internal/streams/doc_counts/failed',
        {
          signal,
          params: { query: { stream: streamName, start: ts.start, end: ts.end } },
        }
      );
      return result.find((d) => d.stream === streamName)?.count ?? 0;
    },
    [streamName, streamsRepositoryClient, canReadFailureStore],
    { withTimeRange: true, withRefresh: true }
  );

  // Unique ignored field names: COUNT_DISTINCT(_ignored) over the current time range.
  const ignoredFieldsResult = useStreamsAppFetch(
    async ({ signal, timeState: ts }) => {
      if (!ts) return 0;
      const response = await executeEsqlQuery({
        query: buildDataQualityIgnoredFieldsCountEsql(dataSourceForTimeRange),
        search: data.search.search,
        signal,
        start: ts.start,
        end: ts.end,
      });
      const countCol = response.columns.findIndex((c) => c.name === 'ignored_fields_count');
      return countCol !== -1 ? (response.values[0]?.[countCol] as number) ?? 0 : 0;
    },
    [dataSourceForTimeRange, data.search.search],
    { withTimeRange: true, withRefresh: true }
  );

  const totalDocs = totalDocsResult.value ?? 0;
  const degradedDocs = degradedDocsResult.value ?? 0;
  const failedDocs = failedDocsResult.value ?? 0;

  const quality = useMemo(
    () => calculateDataQuality({ totalDocs, degradedDocs, failedDocs }),
    [totalDocs, degradedDocs, failedDocs]
  );

  const degradedPercentage = useMemo(
    () => calculatePercentage({ totalDocs, count: degradedDocs }),
    [totalDocs, degradedDocs]
  );

  const failedPercentage = useMemo(
    () => calculatePercentage({ totalDocs, count: failedDocs }),
    [totalDocs, failedDocs]
  );

  const isQualityLoading =
    totalDocsResult.loading || degradedDocsResult.loading || failedDocsResult.loading;

  const dataQualityManagementLinkArgs = [
    '/{key}/management/{tab}',
    {
      path: { key: streamName, tab: 'dataQuality' as const },
      query: { rangeFrom, rangeTo },
    },
  ] as const;

  const dataQualityTabHref = router.link(...dataQualityManagementLinkArgs);

  const formatPct = (value: number) => `${formatNumber(value, '0.[00]')}%`;

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.streams.streamOverview.dataQualityCard.title', {
                defaultMessage: 'Dataset quality',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DatasetQualityIndicator
            quality={quality}
            isLoading={isQualityLoading}
            showTooltip={true}
            dataTestSubj={`streamsOverviewDataQualityIndicator-${streamName}`}
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          {
            // eslint-disable-next-line @elastic/eui/href-or-on-click -- client-side navigation via router.push; href for a11y / new tab
            <EuiLink
              href={dataQualityTabHref}
              data-test-subj="streamsOverviewDataQualityLink"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                router.push(...dataQualityManagementLinkArgs);
              }}
            >
              {i18n.translate('xpack.streams.streamOverview.dataQualityCard.viewAll', {
                defaultMessage: 'View all',
              })}
            </EuiLink>
          }
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexStart"
        responsive
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <OverviewStat
            title={formatPct(degradedPercentage)}
            description={i18n.translate(
              'xpack.streams.streamOverview.dataQualityCard.degradedDocs',
              { defaultMessage: 'Degraded docs' }
            )}
            isLoading={isQualityLoading}
            titleColor="warning"
            dataTestSubj="streamsOverviewDegradedDocs"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <OverviewStat
            title={canReadFailureStore ? formatPct(failedPercentage) : <FailedDocsNoPrivilege />}
            description={i18n.translate('xpack.streams.streamOverview.dataQualityCard.failedDocs', {
              defaultMessage: 'Failed docs',
            })}
            isLoading={canReadFailureStore ? failedDocsResult.loading : false}
            titleColor={canReadFailureStore ? 'danger' : undefined}
            dataTestSubj="streamsOverviewFailedDocs"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <OverviewStat
            title={formatNumber(ignoredFieldsResult.value ?? 0, '0,0')}
            description={i18n.translate(
              'xpack.streams.streamOverview.dataQualityCard.ignoredFields',
              { defaultMessage: 'Ignored fields' }
            )}
            isLoading={ignoredFieldsResult.loading}
            dataTestSubj="streamsOverviewIgnoredFields"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
