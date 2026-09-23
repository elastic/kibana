/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type {
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridSorting,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { SourceViewModel } from './types';
import { SourceGridCell, SourceRowActions } from './source_grid_cell';

export type SourcesGridStatus = 'loading' | 'ready' | 'unavailable';

export const SOURCE_GRID_COLUMNS: EuiDataGridColumn[] = [
  {
    id: 'name',
    displayAsText: i18n.translate('xpack.streams.sources.table.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    defaultSortDirection: 'asc',
  },
  {
    id: 'type',
    displayAsText: i18n.translate('xpack.streams.sources.table.typeColumnLabel', {
      defaultMessage: 'Type',
    }),
  },
  {
    id: 'status',
    displayAsText: i18n.translate('xpack.streams.sources.table.statusColumnLabel', {
      defaultMessage: 'Status',
    }),
    defaultSortDirection: 'asc',
  },
  {
    id: 'throughput',
    displayAsText: i18n.translate('xpack.streams.sources.table.throughputColumnLabel', {
      defaultMessage: 'Throughput',
    }),
  },
  {
    id: 'lastEvent',
    displayAsText: i18n.translate('xpack.streams.sources.table.lastEventColumnLabel', {
      defaultMessage: 'Last event',
    }),
  },
  {
    id: 'destinations',
    displayAsText: i18n.translate('xpack.streams.sources.table.destinationsColumnLabel', {
      defaultMessage: 'Destinations',
    }),
  },
];

interface SourcesGridProps {
  status: SourcesGridStatus;
  sources: SourceViewModel[];
  selectedSources: SourceViewModel[];
  hasActiveFilters: boolean;
  visibleColumns: string[];
  pagination: { pageIndex: number; pageSize: number };
  sortingColumns: EuiDataGridSorting['columns'];
  onVisibleColumnsChange: (columns: string[]) => void;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  onSortingChange: (columns: EuiDataGridSorting['columns']) => void;
  onSelectionChange: (sources: SourceViewModel[]) => void;
  onOpenSource: (sourceId: string) => void;
  onRequestDelete: (sources: SourceViewModel[]) => void;
}

export const SourcesGrid = ({
  status,
  sources,
  selectedSources,
  hasActiveFilters,
  visibleColumns,
  pagination,
  sortingColumns,
  onVisibleColumnsChange,
  onPaginationChange,
  onSortingChange,
  onSelectionChange,
  onOpenSource,
  onRequestDelete,
}: SourcesGridProps) => {
  const selectedSourceIds = React.useMemo(
    () => new Set(selectedSources.map(({ id }) => id)),
    [selectedSources]
  );
  const allSourcesSelected =
    sources.length > 0 && sources.every(({ id }) => selectedSourceIds.has(id));
  const setSelectedSource = React.useCallback(
    (source: SourceViewModel, checked: boolean) => {
      onSelectionChange(
        checked
          ? [...selectedSources, source]
          : selectedSources.filter(({ id }) => id !== source.id)
      );
    },
    [onSelectionChange, selectedSources]
  );
  const leadingControlColumns = React.useMemo<EuiDataGridControlColumn[]>(
    () => [
      {
        id: 'select',
        width: 32,
        headerCellRender: () => (
          <EuiCheckbox
            id="streamsSourcesSelectAll"
            checked={allSourcesSelected}
            onChange={(event) => onSelectionChange(event.target.checked ? sources : [])}
            aria-label={i18n.translate('xpack.streams.sources.selectAllAriaLabel', {
              defaultMessage: 'Select all sources',
            })}
          />
        ),
        rowCellRender: ({ rowIndex }) => {
          const source = sources[rowIndex];
          return source ? (
            <EuiCheckbox
              id={`streamsSourcesSelect-${source.id}`}
              checked={selectedSourceIds.has(source.id)}
              onChange={(event) => setSelectedSource(source, event.target.checked)}
              aria-label={i18n.translate('xpack.streams.sources.selectSourceAriaLabel', {
                defaultMessage: 'Select {sourceName}',
                values: { sourceName: source.name ?? source.id },
              })}
            />
          ) : null;
        },
      },
    ],
    [allSourcesSelected, onSelectionChange, selectedSourceIds, setSelectedSource, sources]
  );
  const trailingControlColumns = React.useMemo<EuiDataGridControlColumn[]>(
    () => [
      {
        id: 'rowActions',
        width: 40,
        headerCellRender: () => (
          <EuiScreenReaderOnly>
            <span>
              {i18n.translate('xpack.streams.sources.table.rowActionsTitle', {
                defaultMessage: 'Source actions',
              })}
            </span>
          </EuiScreenReaderOnly>
        ),
        rowCellRender: ({ rowIndex }) => {
          const source = sources[rowIndex];
          return source ? (
            <SourceRowActions
              source={source}
              onRequestDelete={(sourceToDelete) => onRequestDelete([sourceToDelete])}
            />
          ) : null;
        },
      },
    ],
    [onRequestDelete, sources]
  );
  const renderCellValue = React.useCallback<NonNullable<EuiDataGridProps['renderCellValue']>>(
    ({ rowIndex, columnId }) => {
      const source = sources[rowIndex];
      return source ? (
        <SourceGridCell source={source} columnId={columnId} onOpen={onOpenSource} />
      ) : null;
    },
    [onOpenSource, sources]
  );
  const toolbarVisibility = React.useMemo<EuiDataGridProps['toolbarVisibility']>(
    () => ({
      showColumnSelector: true,
      showDisplaySelector: false,
      showSortSelector: false,
      showFullScreenSelector: false,
      additionalControls:
        selectedSources.length > 0 ? (
          <EuiButtonEmpty
            color="danger"
            size="xs"
            onClick={() => onRequestDelete(selectedSources)}
            data-test-subj="streamsSourcesBulkDeleteButton"
          >
            {i18n.translate('xpack.streams.sources.deleteSelectedButtonLabel', {
              defaultMessage:
                'Delete {count, plural, one {selected source} other {# selected sources}}',
              values: { count: selectedSources.length },
            })}
          </EuiButtonEmpty>
        ) : undefined,
    }),
    [onRequestDelete, selectedSources]
  );

  if (status === 'loading') {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        direction="column"
        gutterSize="m"
        responsive={false}
        data-test-subj="streamsSourcesLoading"
        css={css`
          min-block-size: 240px;
        `}
      >
        <EuiLoadingSpinner size="xl" />
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.sources.loadingTitle', {
              defaultMessage: 'Loading sources',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexGroup>
    );
  }

  if (status === 'unavailable') {
    return (
      <KbnDangerCallout
        announceOnMount={false}
        title={i18n.translate('xpack.streams.sources.unavailableTitle', {
          defaultMessage: 'Sources are unavailable',
        })}
        text={i18n.translate('xpack.streams.sources.unavailableDescription', {
          defaultMessage: 'Refresh the page to try loading the source configuration again.',
        })}
      />
    );
  }

  return (
    <>
      <EuiDataGrid
        aria-label={i18n.translate('xpack.streams.sources.tableCaption', {
          defaultMessage: 'Configured stream sources',
        })}
        columns={SOURCE_GRID_COLUMNS}
        columnVisibility={{
          visibleColumns: visibleColumns.filter((columnId) => columnId !== 'actions'),
          setVisibleColumns: onVisibleColumnsChange,
          canDragAndDropColumns: false,
        }}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={trailingControlColumns}
        rowCount={sources.length}
        renderCellValue={renderCellValue}
        sorting={{ columns: sortingColumns, onSort: onSortingChange }}
        data-test-subj="streamsSourcesTable"
        toolbarVisibility={toolbarVisibility}
        gridStyle={{ border: 'horizontal', header: 'shade', rowHover: 'highlight' }}
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 25, 50],
          onChangeItemsPerPage: (pageSize) => onPaginationChange({ pageIndex: 0, pageSize }),
          onChangePage: (pageIndex) => onPaginationChange({ ...pagination, pageIndex }),
        }}
      />
      {sources.length === 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiEmptyPrompt
            iconType={hasActiveFilters ? 'search' : 'database'}
            title={
              <h2>
                {hasActiveFilters
                  ? i18n.translate('xpack.streams.sources.noMatchingSourcesTitle', {
                      defaultMessage: 'No sources match your filters',
                    })
                  : i18n.translate('xpack.streams.sources.noSourcesTitle', {
                      defaultMessage: 'No sources configured',
                    })}
              </h2>
            }
            body={
              hasActiveFilters
                ? i18n.translate('xpack.streams.sources.noMatchingSourcesDescription', {
                    defaultMessage: 'Adjust your search or filters to see more sources.',
                  })
                : i18n.translate('xpack.streams.sources.noSourcesDescription', {
                    defaultMessage: 'Add a source to start sending data to this stream.',
                  })
            }
          />
        </>
      )}
    </>
  );
};
