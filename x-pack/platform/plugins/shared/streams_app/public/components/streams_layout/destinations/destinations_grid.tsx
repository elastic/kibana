/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { ROW_ACTIONS_COLUMN_WIDTH, RowActionsMenu } from '../row_actions_menu';
import {
  DESTINATION_AUTO_MODE_LABEL,
  DESTINATION_SIGNAL_LABELS,
  LOCAL_ELASTICSEARCH_LABEL,
} from './destination_type_config';
import { DestinationIndicesList } from './destination_indices_list';
import type { DestinationIndexMode, DestinationViewModel } from './types';

export type DestinationsGridStatus = 'loading' | 'ready' | 'unavailable';

const DESTINATION_ACTIONS_LABEL = i18n.translate(
  'xpack.streams.destinations.table.rowActionsTitle',
  { defaultMessage: 'Destination actions' }
);

const getModeLabel = (destination: DestinationViewModel): string => {
  if (destination.mode === 'auto') {
    return DESTINATION_AUTO_MODE_LABEL;
  }
  return destination.index ?? DESTINATION_AUTO_MODE_LABEL;
};

interface DestinationsGridProps {
  status: DestinationsGridStatus;
  destinations: DestinationViewModel[];
  hasActiveFilters: boolean;
  pagination: { pageIndex: number; pageSize: number };
  sortingColumns: Array<{ id: string; direction: 'asc' | 'desc' }>;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  onSortingChange: (columns: Array<{ id: string; direction: 'asc' | 'desc' }>) => void;
  onOpenDestination: (destinationId: string) => void;
  onShowOnCanvas: (destination: DestinationViewModel) => void;
  onRequestDelete: (destination: DestinationViewModel) => void;
  onIndexClick: (indexName: string) => void;
}

export const getDestinationSortableValue = (
  destination: DestinationViewModel,
  columnId: string
): string => {
  switch (columnId) {
    case 'type':
      return LOCAL_ELASTICSEARCH_LABEL;
    case 'mode':
      return getModeLabel(destination);
    case 'name':
    default:
      return destination.name;
  }
};

export const DestinationsGrid = ({
  status,
  destinations,
  hasActiveFilters,
  pagination,
  sortingColumns,
  onPaginationChange,
  onSortingChange,
  onOpenDestination,
  onShowOnCanvas,
  onRequestDelete,
  onIndexClick,
}: DestinationsGridProps) => {
  const [expandedDestinationIds, setExpandedDestinationIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((destinationId: string) => {
    setExpandedDestinationIds((current) => {
      const next = new Set(current);
      if (next.has(destinationId)) {
        next.delete(destinationId);
      } else {
        next.add(destinationId);
      }
      return next;
    });
  }, []);

  const columns = useMemo<Array<EuiBasicTableColumn<DestinationViewModel>>>(
    () => [
      {
        width: '40px',
        isExpander: true,
        name: (
          <span className="euiScreenReaderOnly">
            {i18n.translate('xpack.streams.destinations.table.expandColumnLabel', {
              defaultMessage: 'Expand destination indices',
            })}
          </span>
        ),
        render: (destination: DestinationViewModel) => {
          const isExpanded = expandedDestinationIds.has(destination.id);
          const ariaLabel = isExpanded
            ? i18n.translate('xpack.streams.destinations.table.collapseRowAriaLabel', {
                defaultMessage: 'Collapse indices for {name}',
                values: { name: destination.name },
              })
            : i18n.translate('xpack.streams.destinations.table.expandRowAriaLabel', {
                defaultMessage: 'Expand indices for {name}',
                values: { name: destination.name },
              });
          return (
            <EuiToolTip content={ariaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                onClick={() => toggleExpanded(destination.id)}
                aria-label={ariaLabel}
                iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                data-test-subj="streamsDestinationExpandButton"
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'name',
        name: i18n.translate('xpack.streams.destinations.table.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (_name: string, destination: DestinationViewModel) => (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiButtonEmpty
              flush="left"
              size="xs"
              onClick={() => onOpenDestination(destination.id)}
              data-test-subj="streamsDestinationNameLink"
            >
              {destination.name}
            </EuiButtonEmpty>
            <EuiBadge color="hollow">{DESTINATION_SIGNAL_LABELS[destination.signal]}</EuiBadge>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.destinations.table.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        render: () => <EuiBadge color="hollow">{LOCAL_ELASTICSEARCH_LABEL}</EuiBadge>,
      },
      {
        field: 'mode',
        name: i18n.translate('xpack.streams.destinations.table.modeColumnLabel', {
          defaultMessage: 'Indices',
        }),
        sortable: true,
        render: (_mode: DestinationIndexMode, destination: DestinationViewModel) =>
          getModeLabel(destination),
      },
      {
        width: `${ROW_ACTIONS_COLUMN_WIDTH}px`,
        name: DESTINATION_ACTIONS_LABEL,
        render: (destination: DestinationViewModel) => (
          <RowActionsMenu
            entityName={destination.name}
            tooltip={DESTINATION_ACTIONS_LABEL}
            buttonTestSubj="streamsDestinationRowActionsButton"
            deleteTestSubj="streamsDestinationDeleteAction"
            onShowOnCanvas={() => onShowOnCanvas(destination)}
            onDelete={() => onRequestDelete(destination)}
          />
        ),
      },
    ],
    [expandedDestinationIds, onOpenDestination, onRequestDelete, onShowOnCanvas, toggleExpanded]
  );

  const itemIdToExpandedRowMap = useMemo(() => {
    const expanded: Record<string, React.ReactNode> = {};
    for (const destination of destinations) {
      if (expandedDestinationIds.has(destination.id)) {
        expanded[destination.id] = (
          <DestinationIndicesList
            destination={destination}
            enabled={true}
            onIndexClick={onIndexClick}
          />
        );
      }
    }
    return expanded;
  }, [destinations, expandedDestinationIds, onIndexClick]);

  const sorting = useMemo<EuiTableSortingType<DestinationViewModel>>(() => {
    const [sort] = sortingColumns;
    return {
      sort: sort
        ? {
            field: sort.id as keyof DestinationViewModel,
            direction: sort.direction,
          }
        : undefined,
    };
  }, [sortingColumns]);

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

  const isEmpty = destinations.length === 0;
  const pageStart = pagination.pageIndex * pagination.pageSize;
  const pageItems = destinations.slice(pageStart, pageStart + pagination.pageSize);

  return (
    <div
      css={css`
        position: relative;
        block-size: 100%;
        min-block-size: 0;
      `}
    >
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.streams.destinations.tableCaption', {
          defaultMessage: 'Configured stream destinations',
        })}
        items={pageItems}
        itemId="id"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        columns={columns}
        sorting={sorting}
        onChange={({ sort, page }: CriteriaWithPagination<DestinationViewModel>) => {
          if (sort) {
            onSortingChange([{ id: String(sort.field), direction: sort.direction }]);
          }
          if (page) {
            onPaginationChange({ pageIndex: page.index, pageSize: page.size });
          }
        }}
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: [10, 25, 50],
          totalItemCount: destinations.length,
        }}
        data-test-subj="streamsDestinationsTable"
      />
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
