/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFilterButton,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  type EuiBasicTableColumn,
  type EuiSelectableOption,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { capitalize } from 'lodash';
import {
  VERDICT_OPTIONS,
  IMPACT_OPTIONS,
  getVerdictColor,
  getImpactColor,
} from '@kbn/streams-plugin/common';
import type { Verdict, Impact, SigEvent } from '@kbn/streams-plugin/common';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useKiGeneration } from '../knowledge_indicators_table';
import { EventFlyout } from './event_flyout';
import { useSigEventsList } from './use_sig_events_list';
import { TRANSLATIONS } from './translations';

interface FilterPopoverProps {
  label: string;
  ariaLabel: string;
  options: EuiSelectableOption[];
  numFilters: number;
  numActiveFilters: number;
  onChange: (options: EuiSelectableOption[]) => void;
}

const FilterPopover = ({
  label,
  ariaLabel,
  options,
  numFilters,
  numActiveFilters,
  onChange,
}: FilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={ariaLabel}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          numFilters={numFilters}
          hasActiveFilters={numActiveFilters > 0}
          numActiveFilters={numActiveFilters}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable options={options} onChange={onChange}>
        {(list) => (
          <div
            css={css`
              width: 200px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const MAX_VISIBLE_STREAMS = 3;

const columns: Array<EuiBasicTableColumn<SigEvent>> = [
  {
    field: '@timestamp',
    name: TRANSLATIONS.columns.timestamp,
    sortable: true,
    width: '160px',
    render: (timestamp: string) => {
      const date = new Date(timestamp);
      return (
        <EuiText size="xs">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </EuiText>
      );
    },
  },
  {
    field: 'verdict',
    name: TRANSLATIONS.columns.verdict,
    width: '110px',
    render: (verdict: string) => <EuiBadge color={getVerdictColor(verdict)}>{verdict}</EuiBadge>,
  },
  {
    field: 'title',
    name: TRANSLATIONS.columns.title,
    truncateText: true,
    width: '40%',
  },
  {
    field: 'stream_names',
    name: TRANSLATIONS.columns.streams,
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
                +{remaining} {TRANSLATIONS.moreLabel}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
  },
  {
    field: 'impact',
    name: TRANSLATIONS.columns.impact,
    width: '90px',
    render: (impact: string) => <EuiBadge color={getImpactColor(impact)}>{impact}</EuiBadge>,
  },
  {
    field: 'criticality',
    name: TRANSLATIONS.columns.criticality,
    width: '90px',
    sortable: true,
    render: (criticality: number) => <EuiText size="xs">{criticality}</EuiText>,
  },
  {
    field: 'recommended_action',
    name: TRANSLATIONS.columns.action,
    width: '100px',
    render: (action: string) => (
      <EuiBadge color={action === 'escalate' ? 'danger' : 'hollow'}>{action}</EuiBadge>
    ),
  },
];

export const SignificantEventsList = () => {
  const { events, total, loading, filters, pagination, sort, onTableChange, onFilterChange } =
    useSigEventsList();
  const { filteredStreams } = useKiGeneration();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh: refreshTimefilter } = useTimefilter();

  const [selectedEvent, setSelectedEvent] = useState<SigEvent | null>(null);

  const onSearchChange = useCallback(
    (value: string) => onFilterChange({ search: value }),
    [onFilterChange]
  );

  const verdictSelectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      VERDICT_OPTIONS.map((v) => ({
        label: capitalize(v),
        key: v,
        checked: filters.verdict.includes(v) ? 'on' : undefined,
      })),
    [filters.verdict]
  );

  const impactSelectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      IMPACT_OPTIONS.map((imp) => ({
        label: capitalize(imp),
        key: imp,
        checked: filters.impact.includes(imp) ? 'on' : undefined,
      })),
    [filters.impact]
  );

  const availableStreams = useMemo(
    () => (filteredStreams ?? []).map((s) => s.stream.name).sort(),
    [filteredStreams]
  );

  const streamSelectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      availableStreams.map((name) => ({
        label: name,
        key: name,
        checked: filters.stream.includes(name) ? 'on' : undefined,
      })),
    [availableStreams, filters.stream]
  );

  const onVerdictSelectionChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selected = options
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key as Verdict);
      onFilterChange({ verdict: selected });
    },
    [onFilterChange]
  );

  const onImpactSelectionChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selected = options
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key as Impact);
      onFilterChange({ impact: selected });
    },
    [onFilterChange]
  );

  const onStreamSelectionChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selected = options
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key ?? opt.label);
      onFilterChange({ stream: selected });
    },
    [onFilterChange]
  );

  const handleTableChange = useCallback(
    (criteria: CriteriaWithPagination<SigEvent>) => {
      onTableChange({
        page: criteria.page ? { index: criteria.page.index, size: criteria.page.size } : undefined,
        sort: criteria.sort
          ? { field: criteria.sort.field, direction: criteria.sort.direction }
          : undefined,
      });
    },
    [onTableChange]
  );

  const paginationConfig = useMemo(
    () => ({
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: total,
      pageSizeOptions: [10, 25, 50],
    }),
    [pagination, total]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sort.field,
        direction: sort.direction,
      },
    }),
    [sort]
  );

  const clickableRowCss = css`
    cursor: pointer;
  `;

  const rowProps = useCallback(
    (item: SigEvent) => ({
      onClick: () => setSelectedEvent(item),
      css: clickableRowCss,
    }),
    [clickableRowCss]
  );

  return (
    <div>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow>
          <EuiFieldSearch
            placeholder={TRANSLATIONS.searchPlaceholder}
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            isClearable
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <FilterPopover
              label={TRANSLATIONS.verdictFilter}
              ariaLabel={TRANSLATIONS.verdictPopoverAriaLabel}
              options={verdictSelectableOptions}
              numFilters={VERDICT_OPTIONS.length}
              numActiveFilters={filters.verdict.length}
              onChange={onVerdictSelectionChange}
            />
            <FilterPopover
              label={TRANSLATIONS.impactFilter}
              ariaLabel={TRANSLATIONS.impactPopoverAriaLabel}
              options={impactSelectableOptions}
              numFilters={IMPACT_OPTIONS.length}
              numActiveFilters={filters.impact.length}
              onChange={onImpactSelectionChange}
            />
            <FilterPopover
              label={TRANSLATIONS.streamFilter}
              ariaLabel={TRANSLATIONS.streamPopoverAriaLabel}
              options={streamSelectableOptions}
              numFilters={availableStreams.length}
              numActiveFilters={filters.stream.length}
              onChange={onStreamSelectionChange}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={rangeFrom}
            end={rangeTo}
            onTimeChange={({ start, end }) => updateTimeRange({ from: start, to: end })}
            onRefresh={() => refreshTimefilter()}
            showUpdateButton="iconOnly"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable<SigEvent>
        tableCaption={TRANSLATIONS.tableCaption}
        items={events}
        columns={columns}
        loading={loading}
        pagination={paginationConfig}
        sorting={sorting}
        onChange={handleTableChange}
        rowProps={rowProps}
        noItemsMessage={loading ? TRANSLATIONS.loadingMessage : TRANSLATIONS.noEventsMessage}
      />
      {selectedEvent && (
        <EventFlyout event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};
