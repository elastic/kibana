/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Replace mock data with categorize_text ES query — https://github.com/elastic/ingest-dev/issues/7074

import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import { useStartServices } from '../../../hooks';

type LogLevel = 'error' | 'warning';
type TimeRange = '5m' | '1h' | '1d' | '1w';

interface ErrorPattern {
  key: string;
  level: LogLevel;
  pattern: string;
  docCount: number;
  firstSeen: string;
  lastSeen: string;
  exampleMessage: string;
  component: string | null;
}

const TIME_RANGE_OPTIONS = [
  {
    value: '5m' as TimeRange,
    text: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.time5m', {
      defaultMessage: 'Last 5 minutes',
    }),
  },
  {
    value: '1h' as TimeRange,
    text: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.time1h', {
      defaultMessage: 'Last 1 hour',
    }),
  },
  {
    value: '1d' as TimeRange,
    text: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.time1d', {
      defaultMessage: 'Last 1 day',
    }),
  },
  {
    value: '1w' as TimeRange,
    text: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.time1w', {
      defaultMessage: 'Last 1 week',
    }),
  },
];

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '5m': '5m',
  '1h': '1h',
  '1d': '1d',
  '1w': '1w',
};

const now = Date.now();
const MOCK_PATTERNS: ErrorPattern[] = [
  {
    key: 'opamp_connect',
    level: 'error',
    pattern: 'Failed to connect to the OpAMP server',
    docCount: 24,
    firstSeen: new Date(now - 4 * 60 * 1000).toISOString(),
    lastSeen: new Date(now - 4 * 60 * 1000).toISOString(),
    exampleMessage: 'Failed to connect to the OpAMP server',
    component: null,
  },
  {
    key: 'conn_failed',
    level: 'error',
    pattern: 'Connection failed dial tcp connect connection ...',
    docCount: 12,
    firstSeen: new Date(now - 4 * 60 * 1000).toISOString(),
    lastSeen: new Date(now - 4 * 60 * 1000).toISOString(),
    exampleMessage: 'Connection failed (dial tcp 192.168.65...',
    component: null,
  },
  {
    key: 'websocket_close',
    level: 'error',
    pattern: 'Unexpected error while receiving websocket clo...',
    docCount: 6,
    firstSeen: new Date(now - 4 * 60 * 1000).toISOString(),
    lastSeen: new Date(now - 4 * 60 * 1000).toISOString(),
    exampleMessage: 'Unexpected error while receiving: webs...',
    component: null,
  },
  {
    key: 'queue_full',
    level: 'warning',
    pattern: 'sending queue is full: dropping * spans',
    docCount: 14,
    firstSeen: new Date(now - 30 * 60 * 1000).toISOString(),
    lastSeen: new Date(now - 3 * 60 * 1000).toISOString(),
    exampleMessage: 'sending queue is full: dropping 50 spans',
    component: 'exporter/otlp',
  },
];

const FormattedTimestamp: React.FC<{ value: string }> = ({ value }) => (
  <EuiToolTip
    content={
      <FormattedDate
        value={value}
        year="numeric"
        month="short"
        day="2-digit"
        hour="numeric"
        minute="numeric"
        timeZoneName="short"
      />
    }
  >
    <EuiText size="xs">
      <FormattedRelative value={value} />
    </EuiText>
  </EuiToolTip>
);

export const ErrorPatternPanel: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('error');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  const {
    application: { getUrlForApp },
  } = useStartServices();

  const errorPatterns = useMemo(
    () => MOCK_PATTERNS.filter((p) => p.level === 'error'),
    []
  );
  const warningPatterns = useMemo(
    () => MOCK_PATTERNS.filter((p) => p.level === 'warning'),
    []
  );

  const patterns = selectedLevel === 'error' ? errorPatterns : warningPatterns;
  const totalLogs = MOCK_PATTERNS.reduce((sum, p) => sum + p.docCount, 0);

  const discoverUrl = (pattern: ErrorPattern) => {
    const query = encodeURIComponent(
      `elastic_agent.id:"${agentId}" AND message:"${pattern.exampleMessage.substring(0, 50)}*"`
    );
    return getUrlForApp('discover', {
      path: `#/?_g=(time:(from:now-${timeRange},to:now))&_a=(query:(language:kuery,query:'${query}'))`,
    });
  };

  const columns: Array<EuiBasicTableColumn<ErrorPattern>> = [
    {
      field: 'level',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.levelColumn', {
        defaultMessage: 'Level',
      }),
      width: '75px',
      render: (level: LogLevel) => (
        <EuiBadge color={level === 'error' ? 'danger' : 'warning'}>
          {level === 'error' ? 'Error' : 'Warning'}
        </EuiBadge>
      ),
    },
    {
      field: 'pattern',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.patternColumn', {
        defaultMessage: 'Pattern',
      }),
      render: (pattern: string) => (
        <EuiToolTip content={pattern}>
          <EuiText
            size="xs"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 350,
            }}
          >
            {pattern}
          </EuiText>
        </EuiToolTip>
      ),
    },
    {
      field: 'docCount',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.countColumn', {
        defaultMessage: 'Count',
      }),
      width: '60px',
      align: 'right',
      render: (count: number) => (
        <EuiText size="xs">
          <strong>{count}</strong>
        </EuiText>
      ),
    },
    {
      field: 'firstSeen',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.firstSeenColumn', {
        defaultMessage: 'First seen',
      }),
      width: '100px',
      render: (ts: string) => <FormattedTimestamp value={ts} />,
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.lastSeenColumn', {
        defaultMessage: 'Last seen',
      }),
      width: '100px',
      render: (ts: string) => <FormattedTimestamp value={ts} />,
    },
    {
      field: 'exampleMessage',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.exampleColumn', {
        defaultMessage: 'Example message',
      }),
      render: (msg: string) => (
        <EuiToolTip content={msg}>
          <EuiText
            size="xs"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 250,
            }}
          >
            {msg}
          </EuiText>
        </EuiToolTip>
      ),
    },
    {
      field: 'component',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.componentColumn', {
        defaultMessage: 'Component',
      }),
      width: '120px',
      render: (component: string | null) => (
        <EuiText size="xs">{component ?? '—'}</EuiText>
      ),
    },
    {
      name: '',
      width: '30px',
      render: (item: ErrorPattern) => (
        <EuiToolTip
          content={i18n.translate(
            'xpack.fleet.collectorDetail.errorPatterns.viewInDiscover',
            { defaultMessage: 'Explore matching logs in Kibana Discover' }
          )}
        >
          <EuiLink href={discoverUrl(item)} target="_blank">
            <EuiIcon type="popout" size="s" />
          </EuiLink>
        </EuiToolTip>
      ),
    },
  ];

  const levelToggleButtons = [
    {
      id: 'error' as LogLevel,
      label: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.errorsToggle', {
        defaultMessage: 'Errors ({count})',
        values: { count: errorPatterns.length },
      }),
    },
    {
      id: 'warning' as LogLevel,
      label: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.warningsToggle', {
        defaultMessage: 'Warnings ({count})',
        values: { count: warningPatterns.length },
      }),
    },
  ];

  const emptyMessage =
    selectedLevel === 'error'
      ? i18n.translate('xpack.fleet.collectorDetail.errorPatterns.noErrors', {
          defaultMessage: 'No error patterns found in the selected time range',
        })
      : i18n.translate('xpack.fleet.collectorDetail.errorPatterns.noWarnings', {
          defaultMessage: 'No warning patterns found in the selected time range',
        });

  const summaryText = i18n.translate(
    'xpack.fleet.collectorDetail.errorPatterns.summary',
    {
      defaultMessage:
        '{patternCount} {level} {patternCount, plural, one {pattern} other {patterns}} across {logCount} logs in last {timeRange}',
      values: {
        patternCount: patterns.length,
        level: selectedLevel === 'error' ? 'error' : 'warning',
        logCount: totalLogs,
        timeRange: TIME_RANGE_LABELS[timeRange],
      },
    }
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="collectorErrorPatternPanel">
      <EuiAccordion
        id="collector-error-patterns"
        initialIsOpen={false}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate(
                    'xpack.fleet.collectorDetail.errorPatterns.title',
                    { defaultMessage: 'Error Patterns' }
                  )}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="accent">
                {summaryText}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              options={TIME_RANGE_OPTIONS}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              data-test-subj="errorPatternTimeRange"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend="Log level"
              options={levelToggleButtons}
              idSelected={selectedLevel}
              onChange={(id) => setSelectedLevel(id as LogLevel)}
              buttonSize="compressed"
              data-test-subj="errorPatternLevelToggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          items={patterns}
          columns={columns}
          tableLayout="auto"
          noItemsMessage={emptyMessage}
          data-test-subj="errorPatternTable"
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
