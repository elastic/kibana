/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiBackgroundColorCSS,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import { FilterStateStore, buildCustomFilter } from '@kbn/es-query';

import { useDiscoverLocator } from '../../../hooks/use_locator';

import { useCollectorContext } from './collector_context';
import { OTEL_LOG_INDEX } from './constants';
import type { ErrorPattern, LogLevel, SortField, TimeRange } from './use_error_patterns';
import { useErrorPatterns } from './use_error_patterns';

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

const SORT_OPTIONS = [
  {
    value: 'count' as SortField,
    text: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.sortByCount', {
      defaultMessage: 'Most frequent',
    }),
  },
  {
    value: 'lastSeen' as SortField,
    text: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.sortByLastSeen', {
      defaultMessage: 'Most recent',
    }),
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
    <EuiText size="xs" color="subdued" className="eui-textNoWrap" tabIndex={0}>
      <FormattedRelative value={value} />
    </EuiText>
  </EuiToolTip>
);

const sortPatterns = (patterns: ErrorPattern[], sortField: SortField): ErrorPattern[] => {
  const sorted = [...patterns];
  if (sortField === 'lastSeen') {
    sorted.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  } else {
    sorted.sort((a, b) => b.docCount - a.docCount);
  }
  return sorted;
};

export const ErrorPatternPanel: React.FC = () => {
  const { serviceInstanceId } = useCollectorContext();
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('error');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [sortField, setSortField] = useState<SortField>('count');
  const { euiTheme } = useEuiTheme();
  const backgroundColors = useEuiBackgroundColorCSS();
  const discoverLocator = useDiscoverLocator();

  const { errorPatterns, warningPatterns, errorCount, warningCount, totalLogCount, isLoading } =
    useErrorPatterns({ serviceInstanceId: serviceInstanceId ?? '', timeRange });

  const patterns = useMemo(
    () => sortPatterns(selectedLevel === 'error' ? errorPatterns : warningPatterns, sortField),
    [selectedLevel, errorPatterns, warningPatterns, sortField]
  );

  const rowBackgroundCss =
    selectedLevel === 'error' ? backgroundColors.danger : backgroundColors.warning;

  const getDiscoverUrl = useCallback(
    (pattern: ErrorPattern) =>
      discoverLocator?.getRedirectUrl({
        dataViewSpec: {
          id: OTEL_LOG_INDEX,
          name: OTEL_LOG_INDEX,
          title: OTEL_LOG_INDEX,
          timeFieldName: '@timestamp',
        },
        timeRange: { from: `now-${timeRange}`, to: 'now' },
        filters: [
          buildCustomFilter(
            OTEL_LOG_INDEX,
            {
              bool: {
                filter: [
                  { term: { 'service.instance.id': serviceInstanceId } },
                  {
                    match: {
                      message: {
                        query: pattern.pattern,
                        operator: 'AND' as const,
                        fuzziness: 0,
                        auto_generate_synonyms_phrase_query: false,
                      },
                    },
                  },
                ],
              },
            },
            false,
            false,
            i18n.translate('xpack.fleet.collectorDetail.errorPatterns.discoverFilterName', {
              defaultMessage: 'Error pattern: {pattern}',
              values: { pattern: pattern.pattern },
            }),
            FilterStateStore.APP_STATE
          ),
        ],
      }),
    [discoverLocator, timeRange, serviceInstanceId]
  );

  const columns: Array<EuiBasicTableColumn<ErrorPattern>> = [
    {
      field: 'pattern',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.levelColumn', {
        defaultMessage: 'Level',
      }),
      width: '75px',
      render: () => (
        <EuiBadge color={selectedLevel === 'error' ? 'danger' : 'warning'}>
          {selectedLevel === 'error'
            ? i18n.translate('xpack.fleet.collectorDetail.errorPatterns.levelError', {
                defaultMessage: 'Error',
              })
            : i18n.translate('xpack.fleet.collectorDetail.errorPatterns.levelWarning', {
                defaultMessage: 'Warning',
              })}
        </EuiBadge>
      ),
    },
    {
      field: 'pattern',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.patternColumn', {
        defaultMessage: 'Pattern',
      }),
      render: (pattern: string) => (
        <EuiText size="xs" style={{ fontFamily: euiTheme.font.familyCode }}>
          {pattern}
        </EuiText>
      ),
    },
    {
      field: 'docCount',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.countColumn', {
        defaultMessage: 'Count',
      }),
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
      render: (ts: string) => (ts ? <FormattedTimestamp value={ts} /> : '—'),
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.lastSeenColumn', {
        defaultMessage: 'Last seen',
      }),
      render: (ts: string) => (ts ? <FormattedTimestamp value={ts} /> : '—'),
    },
    {
      field: 'exampleMessage',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.exampleColumn', {
        defaultMessage: 'Example message',
      }),
      render: (msg: string) => (
        <EuiText size="xs" style={{ fontFamily: euiTheme.font.familyCode }}>
          {msg}
        </EuiText>
      ),
    },
    {
      field: 'component',
      name: i18n.translate('xpack.fleet.collectorDetail.errorPatterns.componentColumn', {
        defaultMessage: 'Component',
      }),
      render: (component: string | null) => <EuiText size="xs">{component ?? '—'}</EuiText>,
    },
    {
      name: '',
      render: (item: ErrorPattern) => {
        const href = getDiscoverUrl(item);
        const label = i18n.translate('xpack.fleet.collectorDetail.errorPatterns.viewInDiscover', {
          defaultMessage: 'Explore matching logs in Kibana Discover',
        });
        return href ? (
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="productDiscover"
              size="xs"
              color="text"
              href={href}
              target="_blank"
              aria-label={label}
            />
          </EuiToolTip>
        ) : null;
      },
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

  const currentCount = selectedLevel === 'error' ? errorCount : warningCount;
  const summaryText = i18n.translate('xpack.fleet.collectorDetail.errorPatterns.summary', {
    defaultMessage:
      '{patternCount} {level} {patternCount, plural, one {pattern} other {patterns}} across {logCount} logs in last {timeRange}',
    values: {
      patternCount: currentCount,
      level: selectedLevel === 'error' ? 'error' : 'warning',
      logCount: totalLogCount,
      timeRange: TIME_RANGE_LABELS[timeRange],
    },
  });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="collectorErrorPatternPanel">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.fleet.collectorDetail.errorPatterns.title', {
                defaultMessage: 'Error patterns',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color={
              currentCount === 0 ? 'subdued' : selectedLevel === 'error' ? 'danger' : 'warning'
            }
          >
            {summaryText}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            options={TIME_RANGE_OPTIONS}
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            aria-label={i18n.translate('xpack.fleet.collectorDetail.errorPatterns.timeRangeLabel', {
              defaultMessage: 'Time range',
            })}
            data-test-subj="errorPatternTimeRange"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed data-test-subj="errorPatternLevelToggle">
            <EuiFilterButton
              isSelected={selectedLevel === 'error'}
              isToggle
              onClick={() => setSelectedLevel('error')}
              color={selectedLevel === 'error' && errorCount > 0 ? 'danger' : 'text'}
              withNext
              data-test-subj="errorPatternLevelToggle-error"
            >
              {i18n.translate('xpack.fleet.collectorDetail.errorPatterns.errorsToggle', {
                defaultMessage: 'Errors ({count})',
                values: { count: errorCount },
              })}
            </EuiFilterButton>
            <EuiFilterButton
              isSelected={selectedLevel === 'warning'}
              isToggle
              onClick={() => setSelectedLevel('warning')}
              color={selectedLevel === 'warning' && warningCount > 0 ? 'warning' : 'text'}
              data-test-subj="errorPatternLevelToggle-warning"
            >
              {i18n.translate('xpack.fleet.collectorDetail.errorPatterns.warningsToggle', {
                defaultMessage: 'Warnings ({count})',
                values: { count: warningCount },
              })}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            options={SORT_OPTIONS}
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            prepend={i18n.translate('xpack.fleet.collectorDetail.errorPatterns.sortLabel', {
              defaultMessage: 'Sort',
            })}
            aria-label={i18n.translate('xpack.fleet.collectorDetail.errorPatterns.sortLabel', {
              defaultMessage: 'Sort',
            })}
            data-test-subj="errorPatternSort"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={patterns}
        columns={columns}
        tableCaption={i18n.translate('xpack.fleet.collectorDetail.errorPatterns.tableCaption', {
          defaultMessage: 'Error patterns',
        })}
        tableLayout="auto"
        loading={isLoading}
        noItemsMessage={emptyMessage}
        rowProps={() => ({
          css: rowBackgroundCss,
        })}
        data-test-subj="errorPatternTable"
      />
    </EuiPanel>
  );
};
