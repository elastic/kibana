/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type {
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridProps,
  EuiDataGridSorting,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { DeferredMount } from '../deferred_mount';
import { ROW_ACTIONS_COLUMN_WIDTH, RowActionsMenu } from '../row_actions_menu';
import {
  DestinationGridCell,
  getDestinationSortableValue,
  getTargetedIndexCount,
} from './destination_grid_cell';
import { DestinationIndicesTable } from './destination_indices_table';
import { S3DestinationDetails } from './s3_destination_details';
import type { DestinationDetailActorRef } from './state_machines/destination_detail_state_machine';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';
import type { DestinationViewModel } from './types';

export type DestinationsGridStatus = 'loading' | 'ready' | 'unavailable';
export { getDestinationSortableValue };

const DESTINATION_ACTIONS_LABEL = i18n.translate(
  'xpack.streams.destinations.table.rowActionsTitle',
  { defaultMessage: 'Destination actions' }
);

const NO_INDICES: ResolvedDestinationIndex[] = [];

const EXPAND_COLUMN_WIDTH = 40;
const TYPE_COLUMN_INITIAL_WIDTH = 200;
const INDICES_COLUMN_INITIAL_WIDTH = 100;

export const DESTINATION_GRID_COLUMNS: EuiDataGridColumn[] = [
  {
    id: 'name',
    displayAsText: i18n.translate('xpack.streams.destinations.table.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    defaultSortDirection: 'asc',
  },
  {
    id: 'type',
    displayAsText: i18n.translate('xpack.streams.destinations.table.typeColumnLabel', {
      defaultMessage: 'Type',
    }),
    initialWidth: TYPE_COLUMN_INITIAL_WIDTH,
  },
  {
    id: 'indices',
    displayAsText: i18n.translate('xpack.streams.destinations.table.modeColumnLabel', {
      defaultMessage: 'Indices',
    }),
    initialWidth: INDICES_COLUMN_INITIAL_WIDTH,
  },
];

interface DestinationsGridProps {
  status: DestinationsGridStatus;
  destinations: DestinationViewModel[];
  resolvedIndicesByDestination: ReadonlyMap<string, ResolvedDestinationIndex[]>;
  resolvedIndicesStatus: ResolvedIndicesStatus;
  resolvedIndicesError?: string;
  destinationDetailRefs: ReadonlyMap<string, DestinationDetailActorRef>;
  onShowDestinationDetail: (destinationId: string, viewerId: string) => void;
  onHideDestinationDetail: (destinationId: string, viewerId: string) => void;
  hasActiveFilters: boolean;
  visibleColumns: string[];
  pagination: { pageIndex: number; pageSize: number };
  sortingColumns: EuiDataGridSorting['columns'];
  onVisibleColumnsChange: (columns: string[]) => void;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  onSortingChange: (columns: EuiDataGridSorting['columns']) => void;
  onShowOnCanvas: (destination: DestinationViewModel) => void;
  onRequestDelete: (destination: DestinationViewModel) => void;
}

const getExpandAriaLabel = ({ name, type }: DestinationViewModel, isExpanded: boolean) => {
  if (type === 's3') {
    return isExpanded
      ? i18n.translate('xpack.streams.destinations.table.collapseDetailsAriaLabel', {
          defaultMessage: 'Collapse details for {name}',
          values: { name },
        })
      : i18n.translate('xpack.streams.destinations.table.expandDetailsAriaLabel', {
          defaultMessage: 'Expand details for {name}',
          values: { name },
        });
  }
  return isExpanded
    ? i18n.translate('xpack.streams.destinations.table.collapseRowAriaLabel', {
        defaultMessage: 'Collapse indices for {name}',
        values: { name },
      })
    : i18n.translate('xpack.streams.destinations.table.expandRowAriaLabel', {
        defaultMessage: 'Expand indices for {name}',
        values: { name },
      });
};

export const DestinationsGrid = ({
  status,
  destinations,
  resolvedIndicesByDestination,
  resolvedIndicesStatus,
  resolvedIndicesError,
  destinationDetailRefs,
  onShowDestinationDetail,
  onHideDestinationDetail,
  hasActiveFilters,
  visibleColumns,
  pagination,
  sortingColumns,
  onVisibleColumnsChange,
  onPaginationChange,
  onSortingChange,
  onShowOnCanvas,
  onRequestDelete,
}: DestinationsGridProps) => {
  if (status === 'loading') {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        direction="column"
        gutterSize="m"
        responsive={false}
        data-test-subj="streamsDestinationsLoading"
        css={css`
          min-block-size: 240px;
        `}
      >
        <EuiLoadingSpinner size="xl" />
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.destinations.loadingTitle', {
              defaultMessage: 'Loading destinations',
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
        title={i18n.translate('xpack.streams.destinations.unavailableTitle', {
          defaultMessage: 'Destinations are unavailable',
        })}
        text={i18n.translate('xpack.streams.destinations.unavailableDescription', {
          defaultMessage: 'Refresh the page to try loading the destination configuration again.',
        })}
      />
    );
  }

  return (
    <DestinationsGridTable
      destinations={destinations}
      resolvedIndicesByDestination={resolvedIndicesByDestination}
      resolvedIndicesStatus={resolvedIndicesStatus}
      resolvedIndicesError={resolvedIndicesError}
      destinationDetailRefs={destinationDetailRefs}
      onShowDestinationDetail={onShowDestinationDetail}
      onHideDestinationDetail={onHideDestinationDetail}
      hasActiveFilters={hasActiveFilters}
      visibleColumns={visibleColumns}
      pagination={pagination}
      sortingColumns={sortingColumns}
      onVisibleColumnsChange={onVisibleColumnsChange}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      onShowOnCanvas={onShowOnCanvas}
      onRequestDelete={onRequestDelete}
    />
  );
};

interface DestinationsGridBodyContextValue {
  destinations: DestinationViewModel[];
  expandedDestinationIds: ReadonlySet<string>;
  resolvedIndicesByDestination: ReadonlyMap<string, ResolvedDestinationIndex[]>;
  resolvedIndicesStatus: ResolvedIndicesStatus;
  resolvedIndicesError?: string;
  destinationDetailRefs: ReadonlyMap<string, DestinationDetailActorRef>;
  onShowDestinationDetail: (destinationId: string, viewerId: string) => void;
  onHideDestinationDetail: (destinationId: string, viewerId: string) => void;
}

const DestinationsGridBodyContext = createContext<DestinationsGridBodyContextValue | undefined>(
  undefined
);

// EuiDataGrid renders `renderCustomGridBody` as a component, so it must keep its identity:
// a new function would remount every row and reset the state of expanded index tables.
const DestinationsGridBody = ({
  Cell,
  visibleColumns,
  visibleRowData,
  headerRow,
  footerRow,
}: EuiDataGridCustomBodyProps) => {
  const { euiTheme } = useEuiTheme();
  const context = useContext(DestinationsGridBodyContext);
  if (!context) {
    throw new Error('DestinationsGridBody must be rendered inside DestinationsGridTable');
  }
  const {
    destinations,
    expandedDestinationIds,
    resolvedIndicesByDestination,
    resolvedIndicesStatus,
    resolvedIndicesError,
    destinationDetailRefs,
    onShowDestinationDetail,
    onHideDestinationDetail,
  } = context;
  const rows: React.ReactNode[] = [];

  for (let rowIndex = visibleRowData.startRow; rowIndex < visibleRowData.endRow; rowIndex++) {
    const visibleRowIndex = rowIndex - visibleRowData.startRow;
    const destination = destinations[rowIndex];
    const isExpanded = destination ? expandedDestinationIds.has(destination.id) : false;

    rows.push(
      <div
        key={destination?.id ?? rowIndex}
        css={
          isExpanded &&
          css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          `
        }
      >
        <div
          role="row"
          css={css`
            display: flex;
            min-width: fit-content;
          `}
        >
          {visibleColumns.map((_column, colIndex) => (
            <Cell
              key={`${rowIndex},${colIndex}`}
              colIndex={colIndex}
              visibleRowIndex={visibleRowIndex}
            />
          ))}
        </div>
        {isExpanded && destination && (
          <div
            data-test-subj="streamsDestinationExpandedRow"
            css={css`
              min-width: 100%;
              padding-inline-start: ${EXPAND_COLUMN_WIDTH}px;
            `}
          >
            <div
              css={css`
                padding: ${euiTheme.size.s} ${euiTheme.size.m};
                background-color: ${euiTheme.colors.backgroundBasePlain};
              `}
            >
              {destination.type === 's3' ? (
                <S3DestinationDetails destination={destination} />
              ) : (
                <DeferredMount>
                  <DestinationIndicesTable
                    destinationId={destination.id}
                    indices={resolvedIndicesByDestination.get(destination.id) ?? NO_INDICES}
                    indicesStatus={resolvedIndicesStatus}
                    indicesError={resolvedIndicesError}
                    destinationDetailRef={destinationDetailRefs.get(destination.id)}
                    onShowDestinationDetail={onShowDestinationDetail}
                    onHideDestinationDetail={onHideDestinationDetail}
                  />
                </DeferredMount>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {headerRow}
      {rows}
      {footerRow}
    </>
  );
};

const DestinationsGridTable = ({
  destinations,
  resolvedIndicesByDestination,
  resolvedIndicesStatus,
  resolvedIndicesError,
  destinationDetailRefs,
  onShowDestinationDetail,
  onHideDestinationDetail,
  hasActiveFilters,
  visibleColumns,
  pagination,
  sortingColumns,
  onVisibleColumnsChange,
  onPaginationChange,
  onSortingChange,
  onShowOnCanvas,
  onRequestDelete,
}: Omit<DestinationsGridProps, 'status'>) => {
  const [expandedDestinationIds, setExpandedDestinationIds] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((destination: DestinationViewModel) => {
    setExpandedDestinationIds((current) => {
      const next = new Set(current);
      if (next.has(destination.id)) {
        next.delete(destination.id);
      } else {
        next.add(destination.id);
      }
      return next;
    });
  }, []);

  const leadingControlColumns = useMemo<EuiDataGridControlColumn[]>(
    () => [
      {
        id: 'expand',
        width: EXPAND_COLUMN_WIDTH,
        headerCellRender: () => (
          <EuiScreenReaderOnly>
            <span>
              {i18n.translate('xpack.streams.destinations.table.expandColumnLabel', {
                defaultMessage: 'Expand destination indices',
              })}
            </span>
          </EuiScreenReaderOnly>
        ),
        rowCellRender: ({ rowIndex }) => {
          const destination = destinations[rowIndex];
          if (!destination) {
            return null;
          }
          const isExpanded = expandedDestinationIds.has(destination.id);
          const ariaLabel = getExpandAriaLabel(destination, isExpanded);
          return (
            <EuiToolTip content={ariaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                color="text"
                onClick={() => toggleExpanded(destination)}
                aria-label={ariaLabel}
                iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                iconSize="m"
                data-test-subj="streamsDestinationExpandButton"
              />
            </EuiToolTip>
          );
        },
      },
    ],
    [destinations, expandedDestinationIds, toggleExpanded]
  );

  const trailingControlColumns = useMemo<EuiDataGridControlColumn[]>(
    () => [
      {
        id: 'rowActions',
        width: ROW_ACTIONS_COLUMN_WIDTH,
        headerCellRender: () => (
          <EuiScreenReaderOnly>
            <span>{DESTINATION_ACTIONS_LABEL}</span>
          </EuiScreenReaderOnly>
        ),
        rowCellRender: ({ rowIndex }) => {
          const destination = destinations[rowIndex];
          return destination ? (
            <RowActionsMenu
              entityName={destination.name}
              tooltip={DESTINATION_ACTIONS_LABEL}
              buttonTestSubj="streamsDestinationRowActionsButton"
              deleteTestSubj="streamsDestinationDeleteAction"
              onShowOnCanvas={() => onShowOnCanvas(destination)}
              onDelete={() => onRequestDelete(destination)}
            />
          ) : null;
        },
      },
    ],
    [destinations, onRequestDelete, onShowOnCanvas]
  );

  const renderCellValue = useCallback<NonNullable<EuiDataGridProps['renderCellValue']>>(
    ({ rowIndex, columnId }) => {
      const destination = destinations[rowIndex];
      return destination ? (
        <DestinationGridCell
          destination={destination}
          columnId={columnId}
          targetedIndexCount={getTargetedIndexCount(resolvedIndicesByDestination, destination.id)}
          resolvedIndicesStatus={resolvedIndicesStatus}
        />
      ) : null;
    },
    [destinations, resolvedIndicesByDestination, resolvedIndicesStatus]
  );

  const gridBodyContext = useMemo<DestinationsGridBodyContextValue>(
    () => ({
      destinations,
      expandedDestinationIds,
      resolvedIndicesByDestination,
      resolvedIndicesStatus,
      resolvedIndicesError,
      destinationDetailRefs,
      onShowDestinationDetail,
      onHideDestinationDetail,
    }),
    [
      destinations,
      expandedDestinationIds,
      resolvedIndicesByDestination,
      resolvedIndicesStatus,
      resolvedIndicesError,
      destinationDetailRefs,
      onShowDestinationDetail,
      onHideDestinationDetail,
    ]
  );

  const toolbarVisibility = useMemo<EuiDataGridProps['toolbarVisibility']>(
    () => ({
      showColumnSelector: true,
      showDisplaySelector: false,
      showSortSelector: false,
      showFullScreenSelector: false,
    }),
    []
  );

  const isEmpty = destinations.length === 0;

  return (
    <div
      css={css`
        position: relative;
        block-size: 100%;
        min-block-size: 0;
      `}
    >
      <DestinationsGridBodyContext.Provider value={gridBodyContext}>
        <EuiDataGrid
          height={isEmpty ? 'auto' : undefined}
          aria-label={i18n.translate('xpack.streams.destinations.tableCaption', {
            defaultMessage: 'Configured stream destinations',
          })}
          columns={DESTINATION_GRID_COLUMNS}
          columnVisibility={{
            visibleColumns,
            setVisibleColumns: onVisibleColumnsChange,
            canDragAndDropColumns: false,
          }}
          leadingControlColumns={leadingControlColumns}
          trailingControlColumns={trailingControlColumns}
          rowCount={destinations.length}
          renderCellValue={renderCellValue}
          renderCustomGridBody={DestinationsGridBody}
          sorting={{ columns: sortingColumns, onSort: onSortingChange }}
          data-test-subj="streamsDestinationsTable"
          toolbarVisibility={toolbarVisibility}
          gridStyle={{ border: 'horizontal', header: 'shade', rowHover: 'highlight' }}
          pagination={{
            ...pagination,
            pageSizeOptions: [10, 25, 50],
            onChangeItemsPerPage: (pageSize) => onPaginationChange({ pageIndex: 0, pageSize }),
            onChangePage: (pageIndex) => onPaginationChange({ ...pagination, pageIndex }),
          }}
        />
      </DestinationsGridBodyContext.Provider>
      {isEmpty && (
        <div
          css={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          `}
        >
          <EuiEmptyPrompt
            iconType={hasActiveFilters ? 'search' : 'database'}
            title={
              <h2>
                {hasActiveFilters
                  ? i18n.translate('xpack.streams.destinations.noMatchingDestinationsTitle', {
                      defaultMessage: 'No destinations match your filters',
                    })
                  : i18n.translate('xpack.streams.destinations.noDestinationsTitle', {
                      defaultMessage: 'No destinations configured',
                    })}
              </h2>
            }
            body={
              hasActiveFilters
                ? i18n.translate('xpack.streams.destinations.noMatchingDestinationsDescription', {
                    defaultMessage: 'Adjust your search or filters to see more destinations.',
                  })
                : i18n.translate('xpack.streams.destinations.noDestinationsDescription', {
                    defaultMessage: 'Add a destination to choose where this stream sends data.',
                  })
            }
            css={css`
              pointer-events: auto;
            `}
          />
        </div>
      )}
    </div>
  );
};
