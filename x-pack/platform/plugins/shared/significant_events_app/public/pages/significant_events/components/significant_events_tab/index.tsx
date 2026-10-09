/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { EuiBasicTableColumn, EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { capitalize } from 'lodash';
import useInterval from 'react-use/lib/useInterval';
import { i18n } from '@kbn/i18n';
import {
  getSeverityLabel,
  severitySchema,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  SEVERITY_OPTIONS,
} from '@kbn/significant-events-schema';
import type {
  SignificantEvent,
  SignificantEventResponse,
  SignificantEventStatus,
  Severity,
} from '@kbn/significant-events-schema';
import { useSignificantEventsUrlState } from './use_significant_events_url_state';
import { RUNNING_POLL_INTERVAL_MS } from '../../../../constants';
import { useFetchSignificantEvents } from '../../../../hooks/use_fetch_significant_events';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useTimeRangeUpdate } from '../../../../hooks/use_time_range_update';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { useSignificantEventsPageContext } from '../../context/significant_events_page_context';
import { SignificantEventFlyout } from './significant_event_flyout';
import { FindSignificantEventsButton } from '../streams_view/find_significant_events_button';
import type { SignificantEventsSearchBarProps } from '../../../../components/search_bar';
import { SignificantEventsSearchBar } from '../../../../components/search_bar';
import { formatTimestamp } from '../../../../util/formatters';
import { FilterPopover } from './filter_popover';
import { getSignificantEventStatusColor } from '../shared/status_display';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../shared/translations';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { useTriggerInvestigation } from '../../../../hooks/use_trigger_investigation';
import { useUpdateSignificantEvent } from '../../../../hooks/use_update_significant_event';
import { useBlocksNewActivity } from '../../../../hooks/use_significant_events_maintenance';

export const DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER: Severity[] = ['80-critical', '60-high'];

const RUN_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.runInvestigationButton.ariaLabel',
  {
    defaultMessage: 'Run investigation for this event',
  }
);

const CLOSE_EVENT_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.closeEventButton.ariaLabel',
  {
    defaultMessage: 'Close this significant event',
  }
);

const VIEW_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

const MINIMIZE_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.minimizeDetailsAriaLabel',
  { defaultMessage: 'Collapse details' }
);

const RunInvestigationCell = ({ event }: { event: SignificantEvent }) => {
  const { triggerInvestigation, isTriggering } = useTriggerInvestigation();
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  return (
    <EuiToolTip content={activityBlockTooltip ?? RUN_ARIA_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="inspect"
        aria-label={RUN_ARIA_LABEL}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          if (!isTriggering) triggerInvestigation(event.event_uuid);
        }}
        isDisabled={isTriggering || blocksActivity}
        isLoading={isTriggering}
        size="s"
        color="primary"
        data-test-subj="sigEventRunInvestigationIconButton"
      />
    </EuiToolTip>
  );
};

const CloseEventCell = ({ event }: { event: SignificantEvent }) => {
  const { updateEventStatus, isUpdating } = useUpdateSignificantEvent();

  if (event.status === 'closed') {
    return null;
  }

  return (
    <EuiToolTip content={CLOSE_EVENT_ARIA_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="cross"
        aria-label={CLOSE_EVENT_ARIA_LABEL}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          if (!isUpdating) updateEventStatus({ eventUuid: event.event_uuid, status: 'closed' });
        }}
        isDisabled={isUpdating}
        isLoading={isUpdating}
        size="s"
        color="danger"
        data-test-subj="sigEventCloseIconButton"
      />
    </EuiToolTip>
  );
};

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.searchPlaceholder',
  {
    defaultMessage: 'Search events...',
  }
);
const FETCH_ERROR_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.fetchError',
  {
    defaultMessage: 'Failed to load significant events',
  }
);
const TABLE_CAPTION = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.tableCaption',
  {
    defaultMessage: 'Significant Events',
  }
);
const EVENT_NOT_FOUND_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.eventNotFound',
  {
    defaultMessage: 'Significant event was not found',
  }
);
const LOADING_MESSAGE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.loadingMessage',
  {
    defaultMessage: 'Loading events...',
  }
);
const EMPTY_MESSAGE = i18n.translate('xpack.significantEventsApp.significantEventsTab.emptyBody', {
  defaultMessage: 'No significant events found.',
});

const RESET_FILTERS_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.resetFilters',
  { defaultMessage: 'Reset filters' }
);

export const getSignificantEventTableColumns = ({
  selectedEventId,
  onToggleEvent,
}: {
  selectedEventId?: string;
  onToggleEvent: (eventId: string) => void;
}): Array<EuiBasicTableColumn<SignificantEventResponse>> => [
  {
    name: '',
    width: '40px',
    render: (event: SignificantEventResponse) => {
      const isExpanded = selectedEventId === event.event_id;
      return (
        <EuiToolTip
          content={isExpanded ? MINIMIZE_DETAILS_ARIA_LABEL : VIEW_DETAILS_ARIA_LABEL}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj="significantEventsDetailsButton"
            iconType={isExpanded ? 'minimize' : 'maximize'}
            aria-label={isExpanded ? MINIMIZE_DETAILS_ARIA_LABEL : VIEW_DETAILS_ARIA_LABEL}
            onClick={() => onToggleEvent(event.event_id)}
          />
        </EuiToolTip>
      );
    },
  },
  {
    field: 'title',
    name: i18n.translate('xpack.significantEventsApp.significantEventsTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
    render: (_: unknown, event: SignificantEventResponse) => (
      <EuiButtonEmpty size="s" flush="both" onClick={() => onToggleEvent(event.event_id)}>
        {event.title}
      </EuiButtonEmpty>
    ),
  },
  {
    field: 'status',
    name: i18n.translate('xpack.significantEventsApp.significantEventsTab.statusColumn', {
      defaultMessage: 'Status',
    }),
    width: '100px',
    render: (status: SignificantEventStatus) => (
      <EuiBadge color={getSignificantEventStatusColor(status)}>
        {SIGNIFICANT_EVENT_STATUS_LABELS[status]}
      </EuiBadge>
    ),
  },
  {
    field: 'stream_names',
    name: i18n.translate('xpack.significantEventsApp.significantEventsTab.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    width: '160px',
    // Required for the column's `width` to actually constrain the cell — EUI's
    // `truncateText` only kicks in when the cell is bounded (see tableLayout="fixed" below).
    truncateText: true,
    render: (streamNames: string[]) => {
      const names = streamNames ?? [];
      const [first, ...rest] = names;
      if (!first) return null;
      const overflowCount = rest.length;
      return (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          css={css`
            flex-wrap: nowrap;
            min-width: 0;
          `}
        >
          <EuiFlexItem
            grow={1}
            css={css`
              min-width: 0;
            `}
          >
            <EuiToolTip content={first}>
              <EuiBadge tabIndex={0} color="hollow">
                {first}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
          {overflowCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={rest.join(', ')}>
                <EuiText tabIndex={0} size="xs" color="subdued">
                  +{overflowCount}
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
  },
  {
    field: 'severity',
    name: i18n.translate('xpack.significantEventsApp.significantEventsTab.severityColumn', {
      defaultMessage: 'Severity',
    }),
    width: '100px',
    render: (severity: SignificantEvent['severity']) => (
      <SeverityBadge score={Number.parseInt(severity, 10)} />
    ),
  },
  {
    field: 'created_at',
    name: i18n.translate('xpack.significantEventsApp.significantEventsTab.createdAtColumn', {
      defaultMessage: 'Created at',
    }),
    width: '200px',
    render: (timestamp: string) => formatTimestamp(timestamp),
  },
  {
    name: '',
    width: '88px',
    align: 'right' as const,
    render: (item: SignificantEvent) => (
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <RunInvestigationCell event={item} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CloseEventCell event={item} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

const extractCheckedKeys = (options: EuiSelectableOption[]): string[] =>
  options.filter((option) => option.checked === 'on').map((option) => option.key ?? option.label);

const isSignificantEventStatus = (value: string): value is SignificantEventStatus =>
  SIGNIFICANT_EVENT_STATUS_OPTIONS.some((status) => status === value);

const isSeverity = (value: string): value is Severity => severitySchema.safeParse(value).success;

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

export const SignificantEventsTab = () => {
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();
  const { updateTimeRange } = useTimeRangeUpdate();

  const { filteredStreams } = useKiGeneration();
  // Closed events are hidden by default; users can opt back in via the Status filter.
  const [statusFilter, setStatusFilter] = useState<SignificantEventStatus[]>(() =>
    SIGNIFICANT_EVENT_STATUS_OPTIONS.filter((status) => status === 'open')
  );
  const [severityFilter, setSeverityFilter] = useState<Severity[]>(() => [
    ...DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER,
  ]);
  const [streamFilter, setStreamFilter] = useState<string[]>([]);
  const { selectedEventId, openEventId, toggleEvent, closeEvent, clearSelectedEvent } =
    useSignificantEventsUrlState();

  // Pre-fill the search bar with the deep-linked event_id so the user can see what's active
  // and clear it naturally by clearing the search.
  const [searchQuery, setSearchQuery] = useState(() => selectedEventId ?? '');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Sync the search bar with selectedEventId transitions (deep-link arrival, browser
  // back/forward). On arrival the id is written into the box; when the selection clears
  // externally the stale id is removed — but a query the user typed themselves is kept.
  const prevSelectedEventIdRef = useRef(selectedEventId);
  useEffect(() => {
    const prev = prevSelectedEventIdRef.current;
    prevSelectedEventIdRef.current = selectedEventId;
    if (selectedEventId) {
      setSearchQuery((current) => (current === selectedEventId ? current : selectedEventId));
    } else if (prev) {
      setSearchQuery((current) => (current === prev ? '' : current));
    }
  }, [selectedEventId]);

  const streamOptions = useMemo(
    () => (filteredStreams ?? []).map((s) => s.stream.name).sort(),
    [filteredStreams]
  );

  const { isRunning, isCanceling, handleRun, handleCancel } = useSignificantEventsPageContext();
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();

  // When selectedEvent is active the list is filtered to just that event (server-side,
  // bypassing time range). Otherwise fetch with the current filters and time window.
  const { data, isLoading, isSuccess, isError, refetch, pagination, setPagination } =
    useFetchSignificantEvents({
      from: timeState.start,
      to: timeState.end,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      severity: severityFilter.length > 0 ? severityFilter : undefined,
      stream: streamFilter.length > 0 ? streamFilter : undefined,
      search: debouncedSearch || undefined,
      eventId: selectedEventId,
    });

  useInterval(refetch, isRunning ? RUNNING_POLL_INTERVAL_MS : null);

  // The flyout is open iff the openEvent URL param is present (the URL-state hook normalizes
  // openEvent = selectedEvent on deep-link arrival). Resolved from the loaded list.
  const flyoutEvent = useMemo(
    () => (openEventId ? (data?.hits ?? []).find((e) => e.event_id === openEventId) : undefined),
    [openEventId, data?.hits]
  );

  // Not-found only applies to the selectedEvent (deep-link) path — once the list fetch
  // settles and no event matches, the deep link target no longer exists.
  const eventNotFound = Boolean(selectedEventId && isSuccess && (data?.total ?? 0) === 0);

  // Drop a stale openEvent param once the fetch settles without the event (shared URL to
  // another page of results, or the event left the list after a status change) — otherwise
  // the row toggle and flyout state point at an event that cannot render.
  useEffect(() => {
    if (
      selectedEventId &&
      openEventId &&
      isSuccess &&
      !(data?.hits ?? []).some((e) => e.event_id === openEventId)
    ) {
      closeEvent();
    }
  }, [selectedEventId, openEventId, isSuccess, data, closeEvent]);

  // When the linked event resolves, adapt filters to its actual properties so the filter
  // controls reflect the event rather than the user's previous defaults. Keyed on the event's
  // own property values, so a filter edit by the user does not re-trigger it, while an update
  // to the event itself (e.g. status change) re-adapts.
  const resolvedSelectedEvent = useMemo(
    () =>
      selectedEventId ? (data?.hits ?? []).find((e) => e.event_id === selectedEventId) : undefined,
    [selectedEventId, data?.hits]
  );

  const resolvedStreamNames = useMemo(
    () => resolvedSelectedEvent?.stream_names.join(','),
    [resolvedSelectedEvent]
  );

  const priorTimeRangeRef = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (!resolvedSelectedEvent?.status || !resolvedSelectedEvent?.severity) {
      return;
    }

    const resolvedCreatedAt = resolvedSelectedEvent.created_at;
    const resolvedLatestAt = resolvedSelectedEvent['@timestamp'];

    setStatusFilter([resolvedSelectedEvent.status]);
    setSeverityFilter([resolvedSelectedEvent.severity]);
    setStreamFilter(resolvedStreamNames ? resolvedStreamNames.split(',') : []);

    if (!resolvedCreatedAt || !resolvedLatestAt) {
      return;
    }

    if (!priorTimeRangeRef.current) {
      priorTimeRangeRef.current = {
        from: new Date(timeState.start).toISOString(),
        to: new Date(timeState.end).toISOString(),
      };
    }

    updateTimeRange({ from: resolvedCreatedAt, to: resolvedLatestAt });
  }, [resolvedSelectedEvent, resolvedStreamNames, timeState.start, timeState.end, updateTimeRange]);

  const columns = useMemo(
    () =>
      getSignificantEventTableColumns({
        selectedEventId: openEventId,
        onToggleEvent: toggleEvent,
      }),
    [openEventId, toggleEvent]
  );

  const handleResetFilters = useCallback(() => {
    setStatusFilter(SIGNIFICANT_EVENT_STATUS_OPTIONS.filter((s) => s === 'open'));
    setSeverityFilter([...DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER]);
    setStreamFilter([]);
    clearSelectedEvent();
    if (priorTimeRangeRef.current) {
      updateTimeRange(priorTimeRangeRef.current);
      priorTimeRangeRef.current = null;
    }
  }, [clearSelectedEvent, updateTimeRange]);

  const areFiltersAtDefault = useMemo(
    () =>
      statusFilter.length === 1 &&
      statusFilter[0] === 'open' &&
      severityFilter.length === DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER.length &&
      DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER.every((s) => severityFilter.includes(s)) &&
      streamFilter.length === 0,
    [statusFilter, severityFilter, streamFilter]
  );

  const onStatusChange = useCallback(
    (opts: EuiSelectableOption[]) => {
      setStatusFilter(extractCheckedKeys(opts).filter(isSignificantEventStatus));
      clearSelectedEvent();
    },
    [clearSelectedEvent]
  );

  const onStreamChange = useCallback(
    (opts: EuiSelectableOption[]) => {
      setStreamFilter(extractCheckedKeys(opts));
      clearSelectedEvent();
    },
    [clearSelectedEvent]
  );

  const onSeverityChange = useCallback(
    (opts: EuiSelectableOption[]) => {
      setSeverityFilter(extractCheckedKeys(opts).filter(isSeverity));
      clearSelectedEvent();
    },
    [clearSelectedEvent]
  );

  const filters = useMemo(
    () => [
      {
        label: i18n.translate('xpack.significantEventsApp.significantEventsTab.filter.status', {
          defaultMessage: 'Status',
        }),
        ariaLabel: i18n.translate(
          'xpack.significantEventsApp.significantEventsTab.filter.statusAriaLabel',
          {
            defaultMessage: 'Filter by status',
          }
        ),
        options: buildSelectableOptions({
          values: SIGNIFICANT_EVENT_STATUS_OPTIONS,
          selected: statusFilter,
        }),
        numFilters: SIGNIFICANT_EVENT_STATUS_OPTIONS.length,
        numActiveFilters: statusFilter.length,
        onChange: onStatusChange,
      },
      {
        label: i18n.translate('xpack.significantEventsApp.significantEventsTab.filter.severity', {
          defaultMessage: 'Severity',
        }),
        ariaLabel: i18n.translate(
          'xpack.significantEventsApp.significantEventsTab.filter.severityAriaLabel',
          {
            defaultMessage: 'Filter by severity',
          }
        ),
        options: buildSelectableOptions({
          values: SEVERITY_OPTIONS,
          selected: severityFilter,
          getLabel: getSeverityLabel,
        }),
        numFilters: SEVERITY_OPTIONS.length,
        numActiveFilters: severityFilter.length,
        onChange: onSeverityChange,
      },
      {
        label: i18n.translate('xpack.significantEventsApp.significantEventsTab.filter.stream', {
          defaultMessage: 'Stream',
        }),
        ariaLabel: i18n.translate(
          'xpack.significantEventsApp.significantEventsTab.filter.streamAriaLabel',
          {
            defaultMessage: 'Filter by stream',
          }
        ),
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
    [
      statusFilter,
      severityFilter,
      streamFilter,
      streamOptions,
      onStatusChange,
      onSeverityChange,
      onStreamChange,
    ]
  );

  const onTableChange = ({ page }: { page?: { index: number; size: number } }) => {
    if (page) {
      setPagination({ page: page.index + 1, perPage: page.size });
    }
  };

  const handleQueryChange: SignificantEventsSearchBarProps['onQueryChange'] = (queryPayload) => {
    const next = String(queryPayload.query?.query ?? '');
    setSearchQuery(next);
    // Editing the pre-filled text exits the deep-link selection context. Guarded on an actual
    // edit: this handler is also wired to onQuerySubmit, which fires on date-range changes and
    // Enter — neither of which must destroy the selection.
    if (selectedEventId && next !== selectedEventId) {
      clearSelectedEvent();
    }
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" direction="column" responsive={false} wrap={false}>
          <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow>
              <SignificantEventsSearchBar
                onQuerySubmit={handleQueryChange}
                onQueryChange={handleQueryChange}
                placeholder={SEARCH_PLACEHOLDER}
                query={{
                  query: searchQuery,
                  language: 'text',
                }}
                showDatePicker
                showQueryInput
                enableDateRangePicker
                submitButtonStyle="iconOnly"
                isClearable
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFilterGroup compressed>
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
              <EuiButtonEmpty
                size="xs"
                onClick={handleResetFilters}
                flush="left"
                disabled={areFiltersAtDefault && !selectedEventId}
              >
                {RESET_FILTERS_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FindSignificantEventsButton
                onRun={handleRun}
                onCancel={handleCancel}
                isRunning={isRunning}
                isCanceling={isCanceling}
                isDisabled={isRunning || blocksActivity}
                disabledTooltip={activityBlockTooltip}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isError && (
        <EuiFlexItem grow={false}>
          <KbnDangerCallout announceOnMount title={FETCH_ERROR_TITLE} size="s" />
        </EuiFlexItem>
      )}
      {eventNotFound && (
        <EuiFlexItem grow={false}>
          <KbnDangerCallout
            announceOnMount
            title={EVENT_NOT_FOUND_TITLE}
            size="s"
            onDismiss={clearSelectedEvent}
            data-test-subj="significantEventNotFoundCallout"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiBasicTable<SignificantEventResponse>
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableLayout="fixed"
          tableCaption={TABLE_CAPTION}
          items={data?.hits ?? []}
          itemId="event_id"
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
            isSelected: openEventId === item.event_id,
          })}
          noItemsMessage={isLoading ? LOADING_MESSAGE : EMPTY_MESSAGE}
        />
      </EuiFlexItem>
      {flyoutEvent && <SignificantEventFlyout event={flyoutEvent} onClose={closeEvent} />}
    </EuiFlexGroup>
  );
};
