/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PackQueryFormData, UsePackQueryFormProps } from './queries/use_pack_query_form';
import { resolveInheritedScheduleInput } from './queries/use_pack_query_form';
import { OS_LABELS, PLATFORM_IDS, isPlatformId } from './queries/platforms';
import { formatQuerySchedule } from './format_query_schedule';

export interface PackQueriesTableProps {
  data: PackQueryFormData[];
  isReadOnly?: boolean;
  onDeleteClick?: (item: PackQueryFormData) => void;
  onEditClick?: (item: PackQueryFormData) => void;
  onToggleEnabled?: (item: PackQueryFormData, enabled: boolean) => void;
  selectedItems?: PackQueryFormData[];
  setSelectedItems?: (selection: PackQueryFormData[]) => void;
  packSchedule?: UsePackQueryFormProps['packSchedule'];
}

const DISABLED_ROW_STYLE: React.CSSProperties = { opacity: 0.6 };

/**
 * Character budget for the Schedule cell before it truncates behind a tooltip.
 * The longest untruncated output today is a six-weekday custom rule
 * (`Every week on Sun, Mon, Tue, Wed, Thu, Fri`, 43 chars), so 48 leaves the
 * common cases intact while still catching a full seven-day list or a
 * large-interval variant.
 */
const SCHEDULE_TEXT_MAX_LENGTH = 48;

/**
 * Render schedule text, truncating behind an `EuiToolTip` when it exceeds
 * {@link SCHEDULE_TEXT_MAX_LENGTH}. The tooltip carries the full string so the
 * cell never hides information outright.
 */
const renderScheduleText = (text: string) => {
  if (text.length <= SCHEDULE_TEXT_MAX_LENGTH) {
    return text;
  }

  return (
    <EuiToolTip content={text} disableScreenReaderOutput>
      {/* tabIndex makes the truncated anchor keyboard-reachable, so the tooltip
          is not mouse-only. `aria-label` carries the untruncated text. */}
      <span tabIndex={0} aria-label={text}>
        {`${text.slice(0, SCHEDULE_TEXT_MAX_LENGTH - 1).trimEnd()}…`}
      </span>
    </EuiToolTip>
  );
};

const PackQueriesTableComponent: React.FC<PackQueriesTableProps> = ({
  data,
  isReadOnly,
  onDeleteClick,
  onEditClick,
  onToggleEnabled,
  selectedItems,
  setSelectedItems,
  packSchedule,
}) => {
  const renderScheduleColumn = useCallback(
    (_: unknown, item: PackQueryFormData) => {
      if (item.schedule_type) {
        return renderScheduleText(
          formatQuerySchedule({
            schedule_type: item.schedule_type,
            interval: item.interval,
            rrule_schedule: item.rrule_schedule,
          })
        );
      }

      // A non-override query resolves its effective schedule through the shared
      // helper — the single source of truth (shared with the flyout and the
      // form hook) for whether it inherits a real pack schedule (recurrence, or
      // an explicitly persisted interval) or falls back to its own interval. A
      // legacy pack with no real pack-level schedule synthesizes an interval
      // default that must not shadow the query's own interval.
      return renderScheduleText(
        formatQuerySchedule(resolveInheritedScheduleInput(packSchedule, item.interval))
      );
    },
    [packSchedule]
  );
  const renderDeleteAction = useCallback(
    (item: PackQueryFormData) => (
      <EuiToolTip
        content={i18n.translate('xpack.osquery.pack.queriesTable.deleteActionAriaLabel', {
          defaultMessage: 'Delete {queryName}',
          values: {
            queryName: item.id,
          },
        })}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          color="danger"
          // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
          onClick={() => onDeleteClick && onDeleteClick(item)}
          iconType="trash"
          aria-label={i18n.translate('xpack.osquery.pack.queriesTable.deleteActionAriaLabel', {
            defaultMessage: 'Delete {queryName}',
            values: {
              queryName: item.id,
            },
          })}
        />
      </EuiToolTip>
    ),
    [onDeleteClick]
  );

  const renderEditAction = useCallback(
    (item: PackQueryFormData) => (
      <EuiToolTip
        content={i18n.translate('xpack.osquery.pack.queriesTable.editActionAriaLabel', {
          defaultMessage: 'Edit {queryName}',
          values: {
            queryName: item.id,
          },
        })}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          color="primary"
          // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
          onClick={() => onEditClick && onEditClick(item)}
          iconType="pencil"
          aria-label={i18n.translate('xpack.osquery.pack.queriesTable.editActionAriaLabel', {
            defaultMessage: 'Edit {queryName}',
            values: {
              queryName: item.id,
            },
          })}
        />
      </EuiToolTip>
    ),
    [onEditClick]
  );

  const renderPlatformColumn = useCallback((platform: string) => {
    const ids = platform
      ? platform
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [...PLATFORM_IDS];

    return (
      <EuiFlexGroup gutterSize="xs" wrap>
        {ids.map((id) => (
          <EuiFlexItem key={id} grow={false}>
            <EuiBadge color="hollow">{isPlatformId(id) ? OS_LABELS[id] : id}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }, []);

  const renderVersionColumn = useCallback(
    (version: string) =>
      version
        ? `${version}`
        : i18n.translate('xpack.osquery.pack.queriesTable.osqueryVersionAllLabel', {
            defaultMessage: 'All',
          }),
    []
  );

  const renderEnabledColumn = useCallback(
    (_: unknown, item: PackQueryFormData) => {
      // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
      const handleChange = (e: EuiSwitchEvent) =>
        onToggleEnabled && onToggleEnabled(item, e.target.checked);

      return (
        <EuiSwitch
          label=""
          checked={item.enabled !== false}
          // eslint-disable-next-line react/jsx-no-bind
          onChange={handleChange}
          disabled={isReadOnly || !onToggleEnabled}
          compressed
          data-test-subj={`query-enabled-switch-${item.id}`}
          aria-label={i18n.translate('xpack.osquery.pack.queriesTable.enabledSwitchAriaLabel', {
            defaultMessage: 'Toggle query {queryId} enabled',
            values: { queryId: item.id },
          })}
        />
      );
    },
    [isReadOnly, onToggleEnabled]
  );

  const renderIdColumn = useCallback(
    (id: string, item: PackQueryFormData) =>
      item.enabled === false ? (
        <EuiFlexGroup gutterSize="xs" alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>{id}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default" data-test-subj={`query-disabled-badge-${id}`}>
              {i18n.translate('xpack.osquery.pack.queriesTable.disabledBadgeLabel', {
                defaultMessage: 'Disabled',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>{id}</>
      ),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'id',
        name: i18n.translate('xpack.osquery.pack.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '20%',
        render: renderIdColumn,
      },
      {
        field: 'platform',
        name: i18n.translate('xpack.osquery.pack.queriesTable.osColumnTitle', {
          defaultMessage: 'Operating systems',
        }),
        render: renderPlatformColumn,
      },
      {
        field: 'version',
        name: i18n.translate('xpack.osquery.pack.queriesTable.minVersionColumnTitle', {
          defaultMessage: 'Min version',
        }),
        render: renderVersionColumn,
      },
      // The Schedule column is not gated on `rruleScheduling`: with the flag
      // off every query is interval-mode, and `formatQuerySchedule` renders
      // that as `"{n}s"` — the same value the old "Interval (s)" column showed,
      // just labelled honestly. One column, one i18n key, one order.
      {
        field: 'interval',
        name: i18n.translate('xpack.osquery.pack.queriesTable.scheduleColumnTitle', {
          defaultMessage: 'Schedule',
        }),
        render: renderScheduleColumn,
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.osquery.pack.queriesTable.enabledColumnTitle', {
          defaultMessage: 'Enabled',
        }),
        width: '80px',
        render: renderEnabledColumn,
      },
      ...(!isReadOnly
        ? [
            {
              name: i18n.translate('xpack.osquery.pack.queriesTable.actionsColumnTitle', {
                defaultMessage: 'Actions',
              }),
              width: '120px',
              actions: [
                {
                  render: renderEditAction,
                },
                {
                  render: renderDeleteAction,
                },
              ],
            },
          ]
        : []),
    ],
    [
      isReadOnly,
      renderDeleteAction,
      renderEditAction,
      renderEnabledColumn,
      renderIdColumn,
      renderPlatformColumn,
      renderScheduleColumn,
      renderVersionColumn,
    ]
  );

  const rowProps = useCallback(
    (item: PackQueryFormData) => (item.enabled === false ? { style: DISABLED_ROW_STYLE } : {}),
    []
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'id' as keyof PackQueryFormData,
        direction: 'asc' as const,
      },
    }),
    []
  );

  const itemId = useCallback((item: PackQueryFormData) => item.id ?? '', []);

  const selection = useMemo(
    () => ({
      onSelectionChange: setSelectedItems,
      initialSelected: selectedItems,
    }),
    [selectedItems, setSelectedItems]
  );

  return (
    <EuiBasicTable<PackQueryFormData>
      data-test-subj="packQueriesTable"
      items={data}
      itemId={itemId}
      columns={columns}
      sorting={sorting}
      selection={isReadOnly ? undefined : selection}
      rowProps={rowProps}
      tableCaption={i18n.translate('xpack.osquery.pack.queriesTable.tableCaption', {
        defaultMessage: 'Pack queries',
      })}
    />
  );
};

export const PackQueriesTable = React.memo(PackQueriesTableComponent);
// eslint-disable-next-line import/no-default-export
export default PackQueriesTable;
