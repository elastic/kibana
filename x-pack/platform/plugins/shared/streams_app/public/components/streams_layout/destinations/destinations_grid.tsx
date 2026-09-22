/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiDataGridColumn, EuiDataGridProps, EuiDataGridSorting } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { LOCAL_ELASTICSEARCH_LABEL } from './destination_type_config';
import type { DestinationViewModel } from './types';

export type DestinationsGridStatus = 'loading' | 'ready' | 'unavailable';

const DESTINATION_GRID_COLUMNS: EuiDataGridColumn[] = [
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
  },
];

interface DestinationsGridProps {
  status: DestinationsGridStatus;
  destinations: DestinationViewModel[];
  hasActiveFilters: boolean;
  visibleColumns: string[];
  pagination: { pageIndex: number; pageSize: number };
  sortingColumns: EuiDataGridSorting['columns'];
  onVisibleColumnsChange: (columns: string[]) => void;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  onSortingChange: (columns: EuiDataGridSorting['columns']) => void;
  onOpenDestination: (destinationId: string) => void;
}

export const getDestinationSortableValue = (
  destination: DestinationViewModel,
  columnId: string
): string => {
  switch (columnId) {
    case 'type':
      return LOCAL_ELASTICSEARCH_LABEL;
    case 'name':
    default:
      return destination.name;
  }
};

export const DestinationsGrid = ({
  status,
  destinations,
  hasActiveFilters,
  visibleColumns,
  pagination,
  sortingColumns,
  onVisibleColumnsChange,
  onPaginationChange,
  onSortingChange,
  onOpenDestination,
}: DestinationsGridProps) => {
  const renderCellValue = React.useCallback<NonNullable<EuiDataGridProps['renderCellValue']>>(
    ({ rowIndex, columnId }) => {
      const destination = destinations[rowIndex];
      if (!destination) {
        return null;
      }
      if (columnId === 'name') {
        return (
          <EuiButtonEmpty
            flush="left"
            size="xs"
            onClick={() => onOpenDestination(destination.id)}
            data-test-subj="streamsDestinationNameLink"
          >
            {destination.name}
          </EuiButtonEmpty>
        );
      }
      return <EuiBadge color="hollow">{LOCAL_ELASTICSEARCH_LABEL}</EuiBadge>;
    },
    [destinations, onOpenDestination]
  );

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
    <>
      <EuiDataGrid
        aria-label={i18n.translate('xpack.streams.destinations.tableCaption', {
          defaultMessage: 'Configured stream destinations',
        })}
        columns={DESTINATION_GRID_COLUMNS}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns: onVisibleColumnsChange,
          canDragAndDropColumns: false,
        }}
        rowCount={destinations.length}
        renderCellValue={renderCellValue}
        sorting={{ columns: sortingColumns, onSort: onSortingChange }}
        data-test-subj="streamsDestinationsTable"
        toolbarVisibility={{
          showColumnSelector: true,
          showDisplaySelector: false,
          showSortSelector: false,
          showFullScreenSelector: false,
        }}
        gridStyle={{ border: 'horizontal', header: 'shade', rowHover: 'highlight' }}
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 25, 50],
          onChangeItemsPerPage: (pageSize) => onPaginationChange({ pageIndex: 0, pageSize }),
          onChangePage: (pageIndex) => onPaginationChange({ ...pagination, pageIndex }),
        }}
      />
      {destinations.length === 0 && (
        <>
          <EuiSpacer size="m" />
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
          />
        </>
      )}
    </>
  );
};
