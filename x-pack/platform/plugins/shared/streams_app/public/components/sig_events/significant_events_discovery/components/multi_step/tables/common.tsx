/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  type EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  type CriteriaWithPagination,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getSeverityLevel } from '@kbn/streams-schema';
import { TableTitle } from '../../../../stream_detail_systems/table_title';
import { StreamLink } from '../links';
import type { BaseRecord } from '../types';

export const ACTION_COLOR: Record<string, string> = {
  escalate: 'danger',
  investigate: 'warning',
  monitor: 'primary',
  acknowledge: 'default',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
};

export function criticalityColor(n: number): string {
  return SEVERITY_COLOR[getSeverityLevel(n)];
}

export function renderTimestamp(v?: string) {
  if (!v) return '—';
  return (
    <EuiText size="xs">
      <code>{v.slice(0, 19).replace('T', ' ')}</code>
    </EuiText>
  );
}

export function renderMonoId(v?: string) {
  if (!v) return '—';
  return (
    <EuiText size="xs">
      <code>{v}</code>
    </EuiText>
  );
}

export function renderStreamBadges(v?: string[]) {
  if (!Array.isArray(v) || v.length === 0) return '—';
  return (
    <EuiFlexGroup wrap gutterSize="xs" responsive={false}>
      {v.map((s) => (
        <EuiFlexItem grow={false} key={s}>
          <StreamLink name={s} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

interface RecordsTableProps<TRow extends BaseRecord> {
  items: TRow[];
  columns: Array<EuiBasicTableColumn<TRow>>;
  loading: boolean;
  error: Error | undefined;
  onRefresh: () => void;
  /** Currently expanded row, used to render the minimize/expand toggle state. */
  selectedItem: TRow | null;
  onToggleSelected: (row: TRow) => void;
  /** Bulk-delete the given record ids. */
  onDeleteRecords: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
  emptyMessage: string;
  errorTitle: string;
  tableCaption: string;
  /** Plural noun used in "Showing N of M {label}" */
  itemsLabel: string;
  /** Optional list of fields to support free-text search across (besides `_id`). */
  searchableFields?: ReadonlyArray<string>;
  rowHeader?: string;
}

export function RecordsTable<TRow extends BaseRecord>({
  items,
  columns,
  loading,
  error,
  onRefresh,
  selectedItem,
  onToggleSelected,
  onDeleteRecords,
  isDeleting,
  emptyMessage,
  errorTitle,
  tableCaption,
  itemsLabel,
  searchableFields,
  rowHeader,
}: RecordsTableProps<TRow>) {
  const { euiTheme } = useEuiTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [selectedRows, setSelectedRows] = useState<TRow[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filteredItems = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return items;
    const fields = searchableFields ?? [];
    return items.filter((item) => {
      const recordAsRecord = item as unknown as Record<string, unknown>;
      if (item._id.toLowerCase().includes(trimmed)) return true;
      return fields.some((field) => {
        const value = recordAsRecord[field];
        if (value == null) return false;
        if (Array.isArray(value)) {
          return value.some(
            (entry) => typeof entry === 'string' && entry.toLowerCase().includes(trimmed)
          );
        }
        if (typeof value === 'string') return value.toLowerCase().includes(trimmed);
        if (typeof value === 'number') return String(value).includes(trimmed);
        return false;
      });
    });
  }, [items, searchTerm, searchableFields]);

  const expandColumn = useMemo<EuiBasicTableColumn<TRow>>(
    () => ({
      width: '40px',
      align: 'center',
      isExpander: true,
      name: '',
      render: (row: TRow) => {
        const isExpanded = selectedItem?._id === row._id;
        return (
          <EuiButtonIcon
            data-test-subj="streamsDiscoveryRecordExpandButton"
            iconType={isExpanded ? 'minimize' : 'expand'}
            aria-label={
              isExpanded
                ? i18n.translate(
                    'xpack.streams.sigEventsDiscovery.multiStep.minimizeDetailsAriaLabel',
                    { defaultMessage: 'Collapse details' }
                  )
                : i18n.translate(
                    'xpack.streams.sigEventsDiscovery.multiStep.expandDetailsAriaLabel',
                    { defaultMessage: 'View details' }
                  )
            }
            onClick={() => onToggleSelected(row)}
          />
        );
      },
    }),
    [onToggleSelected, selectedItem]
  );

  const allColumns = useMemo(() => [expandColumn, ...columns], [expandColumn, columns]);

  const handleConfirmDelete = useCallback(async () => {
    const ids = selectedRows.map((row) => row._id);
    setShowDeleteModal(false);
    await onDeleteRecords(ids);
    setSelectedRows([]);
  }, [onDeleteRecords, selectedRows]);

  const isSelectionActionDisabled = selectedRows.length === 0 || isDeleting;

  return (
    <EuiPanel hasBorder={false} hasShadow>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder={i18n.translate(
              'xpack.streams.sigEventsDiscovery.multiStep.searchPlaceholder',
              { defaultMessage: 'Search' }
            )}
            aria-label={i18n.translate(
              'xpack.streams.sigEventsDiscovery.multiStep.searchAriaLabel',
              { defaultMessage: 'Search records' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="refresh"
            size="s"
            onClick={onRefresh}
            isLoading={loading}
            data-test-subj="streamsDiscoveryRecordsRefreshButton"
          >
            {i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={filteredItems.length}
            label={itemsLabel}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            isDisabled={selectedRows.length === 0}
            onClick={() => setSelectedRows([])}
          >
            {i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.clearSelectionLabel', {
              defaultMessage: 'Clear selection',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="trash"
            color="danger"
            size="xs"
            isDisabled={isSelectionActionDisabled}
            isLoading={isDeleting}
            onClick={() => setShowDeleteModal(true)}
            data-test-subj="streamsDiscoveryRecordsDeleteSelectedButton"
          >
            {i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.deleteSelectedLabel', {
              defaultMessage: 'Delete selected',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule
        margin="none"
        css={css`
          height: ${euiTheme.border.width.thick};
        `}
      />
      {error && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut announceOnMount title={errorTitle} color="danger" iconType="alert" size="s">
            {error.message}
          </EuiCallOut>
        </>
      )}
      <EuiPanel
        color="transparent"
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={css`
          overflow-x: auto;
          min-width: 0;
          ${isDeleting
            ? `
              pointer-events: none;
              opacity: 0.6;
            `
            : ''}
        `}
      >
        <EuiInMemoryTable<TRow>
          css={css`
            min-width: 700px;
          `}
          tableCaption={tableCaption}
          items={filteredItems}
          columns={allColumns}
          loading={loading}
          itemId="_id"
          rowHeader={rowHeader}
          selection={{
            selected: selectedRows,
            onSelectionChange: setSelectedRows,
          }}
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
          onTableChange={({ page }: CriteriaWithPagination<TRow>) => {
            if (page) setPagination({ pageIndex: page.index, pageSize: page.size });
          }}
          rowProps={(row) => ({
            style: {
              background:
                selectedItem?._id === row._id
                  ? euiTheme.colors.backgroundBaseInteractiveSelect
                  : undefined,
            },
          })}
          noItemsMessage={!loading ? emptyMessage : ''}
        />
      </EuiPanel>
      {showDeleteModal && (
        <EuiConfirmModal
          aria-label={i18n.translate(
            'xpack.streams.sigEventsDiscovery.multiStep.deleteModalAriaLabel',
            { defaultMessage: 'Delete selected records modal' }
          )}
          title={i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.deleteModalTitle', {
            defaultMessage:
              'Delete {count, plural, one {# selected record} other {# selected records}}?',
            values: { count: selectedRows.length },
          })}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.streams.sigEventsDiscovery.multiStep.deleteModalCancelLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.sigEventsDiscovery.multiStep.deleteModalConfirmLabel',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          confirmButtonDisabled={isDeleting}
          isLoading={isDeleting}
        >
          <p>
            {i18n.translate(
              'xpack.streams.sigEventsDiscovery.multiStep.deleteModalConsequenceMessage',
              { defaultMessage: 'This will permanently delete the selected records.' }
            )}
          </p>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            size="s"
            title={i18n.translate(
              'xpack.streams.sigEventsDiscovery.multiStep.deleteModalWarningMessage',
              { defaultMessage: 'This action cannot be undone.' }
            )}
          />
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
}
