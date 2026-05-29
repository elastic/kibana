/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SIG_EVENT_STATUS_OPTIONS } from '@kbn/streams-schema';
import type { SigEvent } from '@kbn/streams-schema';
import { useFetchSigEvents } from '../../../../../hooks/sig_events/use_fetch_sig_events';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { useDiscoveryWorkflow } from '../../../../../hooks/sig_events/use_discovery_workflow';
import { SigEventFlyout } from './sig_event_flyout';
import { formatTimestamp } from '../../../../../util/formatters';
import { FilterPopover } from './filter_popover';
import { getStatusColor } from './filter_constants';
import { RunDiscoveryEmptyPrompt } from '../shared/run_discovery_empty_prompt';
import { FIND_SIGNIFICANT_EVENTS_LABEL } from '../shared/translations';

const MAX_VISIBLE_STREAMS = 3;

const clickableRowCss = css`
  cursor: pointer;
`;

const SEARCH_PLACEHOLDER = i18n.translate('xpack.streams.sigEventsTab.searchPlaceholder', {
  defaultMessage: 'Search events...',
});
const FETCH_ERROR_TITLE = i18n.translate('xpack.streams.sigEventsTab.fetchError', {
  defaultMessage: 'Failed to load significant events',
});
const TABLE_CAPTION = i18n.translate('xpack.streams.sigEventsTab.tableCaption', {
  defaultMessage: 'Significant Events',
});
const LOADING_MESSAGE = i18n.translate('xpack.streams.sigEventsTab.loadingMessage', {
  defaultMessage: 'Loading events...',
});
const EMPTY_MESSAGE = i18n.translate('xpack.streams.sigEventsTab.emptyBody', {
  defaultMessage: 'No significant events found.',
});
const MORE_LABEL = i18n.translate('xpack.streams.sigEventsTab.moreLabel', {
  defaultMessage: 'more',
});
const RUN_DISCOVERY_RUNNING_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.runDiscoveryRunning',
  { defaultMessage: 'Running discovery...' }
);

const columns: Array<EuiBasicTableColumn<SigEvent>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.sigEventsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    width: '200px',
    render: (timestamp: string) => formatTimestamp(timestamp),
  },
  {
    // TODO: rename field binding to 'status' once the data stream field is renamed
    field: 'verdict',
    name: i18n.translate('xpack.streams.sigEventsTab.statusColumn', {
      defaultMessage: 'Status',
    }),
    width: '110px',
    render: (status: string) => <EuiBadge color={getStatusColor(status)}>{status}</EuiBadge>,
  },
  {
    field: 'title',
    name: i18n.translate('xpack.streams.sigEventsTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
    width: '40%',
  },
  {
    field: 'stream_names',
    name: i18n.translate('xpack.streams.sigEventsTab.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    width: '150px',
    render: (streamNames: string[]) => {
      const names = streamNames ?? [];
      const visible = names.slice(0, MAX_VISIBLE_STREAMS);
      const remaining = names.length - visible.length;
      return (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {visible.map((name, idx) => (
            <EuiFlexItem grow={false} key={`${name}-${idx}`}>
              <EuiBadge color="hollow">{name}</EuiBadge>
            </EuiFlexItem>
          ))}
          {remaining > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                +{remaining} {MORE_LABEL}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
  },
  {
    field: 'criticality',
    name: i18n.translate('xpack.streams.sigEventsTab.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    width: '90px',
    render: (criticality: number | undefined) => <EuiText size="xs">{criticality ?? '-'}</EuiText>,
  },
  {
    field: 'recommended_action',
    name: i18n.translate('xpack.streams.sigEventsTab.actionColumn', {
      defaultMessage: 'Action',
    }),
    width: '100px',
    render: (action?: string) =>
      action ? (
        <EuiBadge color={action === 'escalate' ? 'danger' : 'hollow'}>{action}</EuiBadge>
      ) : (
        '-'
      ),
  },
];

const extractCheckedKeys = (options: EuiSelectableOption[]): string[] =>
  options.filter((opt) => opt.checked === 'on').map((opt) => opt.key ?? opt.label);

const buildSelectableOptions = <T extends string>({
  values,
  selected,
  getLabel = capitalize,
}: {
  values: readonly T[];
  selected: T[];
  getLabel?: (value: T) => string;
}): EuiSelectableOption[] =>
  values.map((v) => ({
    label: getLabel(v),
    key: v,
    checked: selected.includes(v) ? ('on' as const) : undefined,
  }));

export const SigEventsTab = () => {
  const { timeState } = useTimefilter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { filteredStreams } = useKiGeneration();
  const { isRunning, handleRun } = useDiscoveryWorkflow();

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [streamFilter, setStreamFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const streamOptions = useMemo(
    () => (filteredStreams ?? []).map((s) => s.stream.name).sort(),
    [filteredStreams]
  );

  const { data, isLoading, isError, refetch, pagination, setPagination } = useFetchSigEvents({
    from: timeState.start,
    to: timeState.end,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    stream: streamFilter.length > 0 ? streamFilter : undefined,
    search: debouncedSearch || undefined,
  });
  const [selectedEvent, setSelectedEvent] = useState<SigEvent | undefined>();

  const onStatusChange = useCallback(
    (opts: EuiSelectableOption[]) => setStatusFilter(extractCheckedKeys(opts)),
    []
  );

  const onStreamChange = useCallback(
    (opts: EuiSelectableOption[]) => setStreamFilter(extractCheckedKeys(opts)),
    []
  );

  const filters = useMemo(
    () => [
      {
        label: i18n.translate('xpack.streams.sigEventsTab.filter.status', {
          defaultMessage: 'Status',
        }),
        ariaLabel: i18n.translate('xpack.streams.sigEventsTab.filter.statusAriaLabel', {
          defaultMessage: 'Filter by status',
        }),
        options: buildSelectableOptions({
          values: SIG_EVENT_STATUS_OPTIONS,
          selected: statusFilter,
        }),
        numFilters: SIG_EVENT_STATUS_OPTIONS.length,
        numActiveFilters: statusFilter.length,
        onChange: onStatusChange,
      },
      {
        label: i18n.translate('xpack.streams.sigEventsTab.filter.stream', {
          defaultMessage: 'Stream',
        }),
        ariaLabel: i18n.translate('xpack.streams.sigEventsTab.filter.streamAriaLabel', {
          defaultMessage: 'Filter by stream',
        }),
        options: buildSelectableOptions({
          values: streamOptions,
          selected: streamFilter,
          getLabel: (s) => s,
        }),
        numFilters: streamOptions.length,
        numActiveFilters: streamFilter.length,
        onChange: onStreamChange,
      },
    ],
    [statusFilter, streamFilter, streamOptions, onStatusChange, onStreamChange]
  );

  const onTableChange = ({ page }: { page?: { index: number; size: number } }) => {
    if (page) {
      setPagination({ page: page.index + 1, perPage: page.size });
    }
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow>
            <EuiFieldSearch
              placeholder={SEARCH_PLACEHOLDER}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              isClearable
              fullWidth
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              {filters.map((f) => (
                <FilterPopover
                  key={f.label}
                  label={f.label}
                  ariaLabel={f.ariaLabel}
                  options={f.options}
                  numFilters={f.numFilters}
                  numActiveFilters={f.numActiveFilters}
                  onChange={f.onChange}
                />
              ))}
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={rangeFrom}
              end={rangeTo}
              onTimeChange={({ start: s, end: e }) => updateTimeRange({ from: s, to: e })}
              onRefresh={() => refetch()}
              showUpdateButton="iconOnly"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="sparkles"
              onClick={handleRun}
              isDisabled={isRunning}
              isLoading={isRunning}
              data-test-subj="sig_events_run_discovery_button"
            >
              {isRunning ? RUN_DISCOVERY_RUNNING_LABEL : FIND_SIGNIFICANT_EVENTS_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isError && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={FETCH_ERROR_TITLE}
            color="danger"
            iconType="error"
            size="s"
          />
        </EuiFlexItem>
      )}
      {!isLoading && data?.total === 0 ? (
        <EuiFlexItem>
          <RunDiscoveryEmptyPrompt
            onRun={handleRun}
            isRunning={isRunning}
            runTestSubj="sig_events_run_discovery_empty_button"
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiBasicTable<SigEvent>
            tableCaption={TABLE_CAPTION}
            items={data?.hits ?? []}
            columns={columns}
            pagination={{
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
              totalItemCount: data?.total ?? 0,
              pageSizeOptions: [10, 25, 50],
            }}
            onChange={onTableChange}
            loading={isLoading}
            rowProps={(item) => ({
              onClick: () => setSelectedEvent(item),
              css: clickableRowCss,
            })}
            noItemsMessage={isLoading ? LOADING_MESSAGE : EMPTY_MESSAGE}
          />
        </EuiFlexItem>
      )}
      {selectedEvent && (
        <SigEventFlyout event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
      )}
    </EuiFlexGroup>
  );
};
