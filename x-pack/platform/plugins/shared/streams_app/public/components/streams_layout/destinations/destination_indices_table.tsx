/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { DocumentsColumn } from '../../stream_list_view/documents_column';
import { IngestionColumn } from '../../stream_list_view/ingestion_column';
import { RetentionColumn } from '../../stream_list_view/retention_column';
import { StorageColumn } from '../../stream_list_view/storage_column';
import {
  DATA_QUALITY_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
  INGESTION_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER_ARIA_LABEL,
  STORAGE_COLUMN_HEADER,
} from '../../stream_list_view/translations';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';
import type { DestinationIndexStats } from './use_destination_index_stats';

const DATA_STREAM_ONLY_TOOLTIP = i18n.translate(
  'xpack.streams.destinations.indices.dataStreamOnlyTooltip',
  { defaultMessage: 'Only available for data streams.' }
);

const QUALITY_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.streams.destinations.indices.qualityUnavailableTooltip',
  {
    defaultMessage:
      "Data quality is unavailable because the failure store couldn't be read for this data stream.",
  }
);

const UnavailableValue = ({
  tooltip,
  dataTestSubj = 'streamsDestinationIndexValueUnavailable',
}: {
  tooltip: string;
  dataTestSubj?: string;
}) => (
  <EuiToolTip content={tooltip}>
    <span tabIndex={0} data-test-subj={dataTestSubj}>
      -
    </span>
  </EuiToolTip>
);

const isModifiedClick = (event: React.MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const themePx = (base: number, units: number): string => `${base * units}px`;

const DataStreamOnlyValue = () => (
  <UnavailableValue
    tooltip={DATA_STREAM_ONLY_TOOLTIP}
    dataTestSubj="streamsDestinationIndexDataStreamOnly"
  />
);

interface DestinationIndicesTableProps {
  indices: ResolvedDestinationIndex[];
  status: ResolvedIndicesStatus;
  error?: string;
  stats: DestinationIndexStats;
}

export const DestinationIndicesTable = ({
  indices,
  status,
  error,
  stats,
}: DestinationIndicesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const nameMinWidth = themePx(euiTheme.base, 14);
  const nameMaxWidth = themePx(euiTheme.base, 22);
  const documentsMinWidth = themePx(euiTheme.base, 10);
  const metricMinWidth = themePx(euiTheme.base, 8);
  const retentionMinWidth = themePx(euiTheme.base, 12);
  const columns = useMemo<Array<EuiBasicTableColumn<ResolvedDestinationIndex>>>(
    () => [
      {
        name: i18n.translate('xpack.streams.destinations.indices.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        minWidth: nameMinWidth,
        maxWidth: nameMaxWidth,
        align: 'left',
        render: (index: ResolvedDestinationIndex) => (
          <EuiLink
            data-test-subj="streamsDestinationIndexLink"
            href={router.link('/new-experience/indices/{indexName}/{tab}', {
              path: { indexName: index.name, tab: 'overview' },
              query: { rangeFrom, rangeTo },
            })}
            onClick={(event: React.MouseEvent) => {
              if (isModifiedClick(event)) {
                return;
              }
              event.preventDefault();
              router.push('/new-experience/indices/{indexName}/{tab}', {
                path: { indexName: index.name, tab: 'overview' },
                query: { rangeFrom, rangeTo },
              });
            }}
          >
            {index.name}
          </EuiLink>
        ),
      },
      {
        name: DOCUMENTS_COLUMN_HEADER,
        minWidth: documentsMinWidth,
        align: 'center',
        render: (index: ResolvedDestinationIndex) => (
          <DocumentsColumn
            indexPattern={index.name}
            histogramQueryFetch={stats.getIndexHistogram(index.name)}
            retainHistogramQueryFetch={stats.retainIndexHistogram}
            timeState={stats.timeState}
            numDataPoints={stats.numDataPoints}
            layout="stacked"
          />
        ),
      },
      {
        name: INGESTION_COLUMN_HEADER,
        minWidth: metricMinWidth,
        align: 'center',
        render: (index: ResolvedDestinationIndex) =>
          index.is_data_stream ? (
            <IngestionColumn
              rate={stats.ingestionByIndex[index.name] ?? 0}
              isLoading={!stats.ingestionLoaded}
              hasError={stats.ingestionError}
            />
          ) : (
            <DataStreamOnlyValue />
          ),
      },
      {
        name: STORAGE_COLUMN_HEADER,
        minWidth: metricMinWidth,
        align: 'center',
        render: (index: ResolvedDestinationIndex) =>
          index.is_data_stream ? (
            <StorageColumn
              sizeBytes={stats.storageByIndex[index.name] ?? 0}
              isLoading={!stats.storageLoaded}
              hasError={stats.storageError}
            />
          ) : (
            <DataStreamOnlyValue />
          ),
      },
      {
        name: DATA_QUALITY_COLUMN_HEADER,
        minWidth: metricMinWidth,
        align: 'center',
        render: (index: ResolvedDestinationIndex) => {
          if (!index.is_data_stream) {
            return <DataStreamOnlyValue />;
          }
          const quality = stats.getIndexQuality(index.name);
          if (!quality && !stats.qualityIsLoading) {
            return <UnavailableValue tooltip={QUALITY_UNAVAILABLE_TOOLTIP} />;
          }
          return (
            <EuiLink
              href={router.link('/new-experience/indices/{indexName}/{tab}', {
                path: { indexName: index.name, tab: 'quality' },
                query: { rangeFrom, rangeTo },
              })}
              data-test-subj={`streamsDataQualityLink-${index.name}`}
              onClick={(event: React.MouseEvent) => {
                if (isModifiedClick(event)) {
                  return;
                }
                event.preventDefault();
                router.push('/new-experience/indices/{indexName}/{tab}', {
                  path: { indexName: index.name, tab: 'quality' },
                  query: { rangeFrom, rangeTo },
                });
              }}
            >
              <DatasetQualityIndicator
                dataTestSubj={`dataQualityIndicator-${index.name}`}
                quality={quality ?? 'good'}
                isLoading={stats.qualityIsLoading}
                showTooltip={true}
              />
            </EuiLink>
          );
        },
      },
      {
        name: (
          <span aria-label={RETENTION_COLUMN_HEADER_ARIA_LABEL}>{RETENTION_COLUMN_HEADER}</span>
        ),
        minWidth: retentionMinWidth,
        align: 'center',
        render: (index: ResolvedDestinationIndex) =>
          index.is_data_stream ? (
            <RetentionColumn
              lifecycle={index.lifecycle}
              streamName={index.name}
              dataTestSubj={`destinationIndexRetention-${index.name}`}
            />
          ) : (
            <DataStreamOnlyValue />
          ),
      },
    ],
    [
      documentsMinWidth,
      metricMinWidth,
      nameMaxWidth,
      nameMinWidth,
      rangeFrom,
      rangeTo,
      retentionMinWidth,
      router,
      stats,
    ]
  );

  const expandedContentStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.xxl};
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  if (status === 'loading' && indices.length === 0) {
    return (
      <div css={expandedContentStyles}>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          data-test-subj="streamsDestinationIndicesLoading"
        >
          <EuiLoadingSpinner size="m" />
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.streams.destinations.indices.loadingDescription"
              defaultMessage="Loading indices"
            />
          </EuiText>
        </EuiFlexGroup>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div css={expandedContentStyles}>
        <EuiText size="s" color="danger" data-test-subj="streamsDestinationIndicesError">
          <p>
            {error ??
              i18n.translate('xpack.streams.destinations.indices.loadFailedDescription', {
                defaultMessage: 'Could not load indices for this destination.',
              })}
          </p>
        </EuiText>
      </div>
    );
  }

  if (indices.length === 0) {
    return (
      <div css={expandedContentStyles}>
        <EuiText size="s" color="subdued" data-test-subj="streamsDestinationIndicesEmpty">
          <p>
            <FormattedMessage
              id="xpack.streams.destinations.indices.emptyDescription"
              defaultMessage="No indices match this destination's write scope yet."
            />
          </p>
        </EuiText>
      </div>
    );
  }

  return (
    <div
      data-test-subj="streamsDestinationIndicesTable"
      css={css`
        ${expandedContentStyles};
      `}
    >
      <EuiBasicTable
        compressed
        responsiveBreakpoint={false}
        tableLayout="auto"
        tableCaption={i18n.translate('xpack.streams.destinations.indices.tableCaption', {
          defaultMessage: 'Indices targeted by this destination',
        })}
        items={indices}
        itemId={(index: ResolvedDestinationIndex) => index.name}
        columns={columns}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};

          thead {
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          }
        `}
      />
    </div>
  );
};
