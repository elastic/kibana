/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CreateDestinationModal } from './create_destination_modal';
import { DestinationDetailsFlyout } from './destination_details_flyout';
import { getDestinationSortableValue, DestinationsGrid } from './destinations_grid';
import { DestinationsToolbar } from './destinations_toolbar';
import { useDestinationsTable } from './destinations_context';
import { LOCAL_ELASTICSEARCH_LABEL } from './destination_type_config';

export const DestinationsTab = () => {
  const destinationsController = useDestinationsTable();
  const {
    destinations,
    query,
    selectedDestination,
    isCreateModalOpen,
    isRefreshingUnit,
    isLoadingUnit,
    isUnitUnavailable,
    selectedTypes,
    sortingColumns,
    pagination,
    visibleColumnIds,
    refreshUnit,
    setQuery,
    setSelectedTypes,
    setSortingColumns,
    setPagination,
    setVisibleColumnIds,
    openCreateModal,
    closeCreateModal,
    openDestinationFlyout,
    closeDestinationFlyout,
  } = destinationsController;

  const filteredDestinations = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return destinations.filter(
      (destination) =>
        (!normalizedQuery ||
          [destination.name, destination.id, destination.index, LOCAL_ELASTICSEARCH_LABEL]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)) &&
        (selectedTypes.length === 0 || selectedTypes.includes(destination.type))
    );
  }, [destinations, query, selectedTypes]);

  const sortedDestinations = React.useMemo(() => {
    const [sort] = sortingColumns;
    if (!sort) {
      return filteredDestinations;
    }

    return [...filteredDestinations].sort((a, b) => {
      const order = getDestinationSortableValue(a, sort.id).localeCompare(
        getDestinationSortableValue(b, sort.id)
      );
      return sort.direction === 'asc' ? order : -order;
    });
  }, [filteredDestinations, sortingColumns]);

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        css={css`
          flex: 1 1 auto;
          min-block-size: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiSpacer size="m" />
          <DestinationsToolbar
            query={query}
            selectedTypes={selectedTypes}
            isRefreshing={isRefreshingUnit}
            onQueryChange={setQuery}
            onSelectedTypesChange={setSelectedTypes}
            onRefresh={refreshUnit}
            onAddDestination={openCreateModal}
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            min-block-size: 0;
          `}
        >
          <DestinationsGrid
            status={isLoadingUnit ? 'loading' : isUnitUnavailable ? 'unavailable' : 'ready'}
            destinations={sortedDestinations}
            hasActiveFilters={query.trim().length > 0 || selectedTypes.length > 0}
            visibleColumns={visibleColumnIds}
            pagination={pagination}
            sortingColumns={sortingColumns}
            onVisibleColumnsChange={setVisibleColumnIds}
            onPaginationChange={setPagination}
            onSortingChange={setSortingColumns}
            onOpenDestination={openDestinationFlyout}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isCreateModalOpen && (
        <CreateDestinationModal destinations={destinationsController} onClose={closeCreateModal} />
      )}
      {selectedDestination && (
        <DestinationDetailsFlyout
          destinations={destinationsController}
          destination={selectedDestination}
          onClose={closeDestinationFlyout}
        />
      )}
    </>
  );
};
