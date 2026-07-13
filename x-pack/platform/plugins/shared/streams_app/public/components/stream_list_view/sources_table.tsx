/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { StreamsListTableTools } from './streams_list_table_tools';
import { SourceFlyout } from './source_flyout';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';

type SourceStatus = 'healthy' | 'degraded' | 'unhealthy';

interface SourceRow {
  name: string;
  type: string;
  status: SourceStatus;
  /** Numeric events-per-second, used for the label and sorting. */
  rate: number;
  /** Pre-generated sparkline sample heights (0-100) for the Rate column. */
  rateSeries: number[];
  /** Human label for the last event ("2s ago"). */
  lastEvent: string;
  /** Seconds since the last event, used for sorting. */
  lastEventSeconds: number;
}

/** Deterministic pseudo-random sparkline samples so the demo stays stable. */
function makeSeries(seed: number, count = 24): number[] {
  const out: number[] = [];
  let state = seed;
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    out.push(15 + (state % 85));
  }
  return out;
}

/** Flat, near-zero sparkline for sources that aren't currently ingesting. */
const FLATLINE = new Array(24).fill(0).map((_, i) => (i % 6 === 0 ? 6 : 2));

/**
 * Demo-only mock sources. The real Sources data shape isn't finalized yet, so
 * the table renders realistic-looking dummy values for each column.
 */
const SOURCE_ROWS: SourceRow[] = [
  {
    name: 'MOTLP endpoint',
    type: 'Managed / OTel',
    status: 'healthy',
    rate: 12000,
    rateSeries: makeSeries(11),
    lastEvent: '2s ago',
    lastEventSeconds: 2,
  },
  {
    name: 'Kafka cluster',
    type: 'Self-managed / Kafka',
    status: 'healthy',
    rate: 21000,
    rateSeries: makeSeries(29),
    lastEvent: '1s ago',
    lastEventSeconds: 1,
  },
  {
    name: 'AWS CloudWatch',
    type: 'Managed / AWS',
    status: 'healthy',
    rate: 8400,
    rateSeries: makeSeries(47),
    lastEvent: '5s ago',
    lastEventSeconds: 5,
  },
  {
    name: 'Google Cloud Logging',
    type: 'Managed / GCP',
    status: 'healthy',
    rate: 6100,
    rateSeries: makeSeries(63),
    lastEvent: '3s ago',
    lastEventSeconds: 3,
  },
  {
    name: 'Azure Monitor',
    type: 'Managed / Azure',
    status: 'degraded',
    rate: 3200,
    rateSeries: makeSeries(83),
    lastEvent: '42s ago',
    lastEventSeconds: 42,
  },
  {
    name: 'Fluentd forwarder',
    type: 'Self-managed / OTel',
    status: 'healthy',
    rate: 940,
    rateSeries: makeSeries(101),
    lastEvent: '11s ago',
    lastEventSeconds: 11,
  },
  {
    name: 'Syslog collector',
    type: 'Self-managed / Syslog',
    status: 'degraded',
    rate: 1500,
    rateSeries: makeSeries(127),
    lastEvent: '1m ago',
    lastEventSeconds: 60,
  },
  {
    name: 'Filebeat',
    type: 'Self-managed / Beats',
    status: 'unhealthy',
    rate: 0,
    rateSeries: FLATLINE,
    lastEvent: '6m ago',
    lastEventSeconds: 360,
  },
];

const STATUS_META: Record<SourceStatus, { color: 'success' | 'warning' | 'danger'; label: string }> =
  {
    healthy: {
      color: 'success',
      label: i18n.translate('xpack.streams.sourcesTable.status.healthy', {
        defaultMessage: 'Healthy',
      }),
    },
    degraded: {
      color: 'warning',
      label: i18n.translate('xpack.streams.sourcesTable.status.degraded', {
        defaultMessage: 'Degraded',
      }),
    },
    unhealthy: {
      color: 'danger',
      label: i18n.translate('xpack.streams.sourcesTable.status.unhealthy', {
        defaultMessage: 'Unhealthy',
      }),
    },
  };

/** Formats an events-per-second value like "12k/s". */
function formatRate(rate: number): string {
  if (rate <= 0) return '0/s';
  if (rate < 1000) return `${rate}/s`;
  const thousands = rate / 1000;
  const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return `${rounded}k/s`;
}

function RateSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div
      aria-hidden="true"
      className={css`
        display: flex;
        align-items: flex-end;
        gap: 1px;
        block-size: 20px;
        inline-size: 96px;
      `}
    >
      {values.map((value, index) => (
        <div
          key={index}
          className={css`
            flex: 1 1 auto;
            block-size: ${Math.max(2, (value / max) * 20)}px;
            background-color: ${color};
            border-radius: 1px;
          `}
        />
      ))}
    </div>
  );
}

export function SourcesTable() {
  const { euiTheme } = useEuiTheme();
  const [selectedSource, setSelectedSource] = useState<string | undefined>();

  const rateColorFor = (status: SourceStatus): string => {
    if (status === 'unhealthy') return euiTheme.colors.textDisabled;
    if (status === 'degraded') return euiTheme.colors.warning;
    return euiTheme.colors.success;
  };

  const columns: Array<EuiBasicTableColumn<SourceRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.sourcesTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (name: string) => (
        <EuiLink
          href="#"
          data-test-subj={`sourceNameLink-${name}`}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            setSelectedSource(name);
          }}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.streams.sourcesTable.typeColumn', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      render: (type: string) => (
        <EuiText size="s" color="subdued">
          {type}
        </EuiText>
      ),
    },
    {
      field: 'status',
      name: i18n.translate('xpack.streams.sourcesTable.statusColumn', {
        defaultMessage: 'Status',
      }),
      sortable: (row: SourceRow) => row.status,
      render: (status: SourceStatus) => (
        <EuiHealth color={STATUS_META[status].color}>{STATUS_META[status].label}</EuiHealth>
      ),
    },
    {
      field: 'rate',
      name: i18n.translate('xpack.streams.sourcesTable.rateColumn', {
        defaultMessage: 'Rate',
      }),
      sortable: (row: SourceRow) => row.rate,
      render: (_rate: number, row: SourceRow) => (
        <div
          className={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
          `}
        >
          <RateSparkline values={row.rateSeries} color={rateColorFor(row.status)} />
          <EuiText size="xs" color="subdued">
            {formatRate(row.rate)}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'lastEvent',
      name: i18n.translate('xpack.streams.sourcesTable.lastEventColumn', {
        defaultMessage: 'Last event',
      }),
      sortable: (row: SourceRow) => row.lastEventSeconds,
      render: (lastEvent: string) => (
        <EuiText size="s" color="subdued">
          {lastEvent}
        </EuiText>
      ),
    },
  ];

  return (
    <>
      <EuiInMemoryTable<SourceRow>
        tableCaption={i18n.translate('xpack.streams.sourcesTable.tableCaption', {
          defaultMessage: 'Sources table',
        })}
        data-test-subj="sourcesTable"
        items={SOURCE_ROWS}
        columns={columns}
        sorting={{ sort: { field: 'lastEvent', direction: 'asc' } }}
        search={{
          box: {
            incremental: true,
            compressed: true,
            'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
          },
          toolsRight: (
            <StreamsListTableTools
              newButtonLabel={i18n.translate('xpack.streams.sourcesTable.newButtonLabel', {
                defaultMessage: 'New source',
              })}
            />
          ),
        }}
      />
      {selectedSource && (
        <SourceFlyout sourceName={selectedSource} onClose={() => setSelectedSource(undefined)} />
      )}
    </>
  );
}
