/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useNavigateToCanvasSearch } from '../../stream_management/data_management/stream_detail_canvas/use_navigate_to_canvas_search';
import { StreamFlyout } from '../../stream_flyout';
import { CreateDestinationModal } from './create_destination_modal';
import { DeleteDestinationConfirmation } from './delete_destination_confirmation';
import { UnitDestinationFlyout } from './unit_destination_flyout';
import { getDestinationSortableValue, DestinationsGrid } from './destinations_grid';
import { DestinationsToolbar } from './destinations_toolbar';
import { useDestinationsTable } from './destinations_context';
import { LOCAL_ELASTICSEARCH_LABEL } from './destination_type_config';
import type { DestinationViewModel } from './types';

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
    refreshUnit,
    setQuery,
    setSelectedTypes,
    setSortingColumns,
    setPagination,
    openCreateModal,
    closeCreateModal,
    openDestinationFlyout,
    closeDestinationFlyout,
    deleteDestination,
    isUnitSaving,
  } = destinationsController;
  const navigateToCanvasSearch = useNavigateToCanvasSearch();
  const [indexFlyoutName, setIndexFlyoutName] = useState<string | undefined>();
  const openIndexDetail = useCallback(
    (indexName: string) => {
      closeDestinationFlyout();
      setIndexFlyoutName(indexName);
    },
    [closeDestinationFlyout]
  );
  const showOnCanvas = useCallback(
    (destination: DestinationViewModel) => navigateToCanvasSearch(destination.name),
    [navigateToCanvasSearch]
  );
  const [destinationPendingDeletion, setDestinationPendingDeletion] = useState<
    DestinationViewModel | undefined
  >();
  const cancelDeletion = useCallback(() => setDestinationPendingDeletion(undefined), []);
  const confirmDeletion = useCallback(() => {
    if (destinationPendingDeletion) {
      deleteDestination(destinationPendingDeletion.id);
    }
    setDestinationPendingDeletion(undefined);
  }, [deleteDestination, destinationPendingDeletion]);

  const filteredDestinations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return destinations.filter(
      (destination) =>
        (!normalizedQuery ||
          [
            destination.name,
            destination.id,
            destination.index,
            destination.signal,
            destination.mode,
            LOCAL_ELASTICSEARCH_LABEL,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)) &&
        (selectedTypes.length === 0 || selectedTypes.includes(destination.type))
    );
  }, [destinations, query, selectedTypes]);

  const sortedDestinations = useMemo(() => {
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
            isAddDisabled={isUnitSaving}
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
            pagination={pagination}
            sortingColumns={sortingColumns}
            onPaginationChange={setPagination}
            onSortingChange={setSortingColumns}
            onOpenDestination={(destinationId) => {
              setIndexFlyoutName(undefined);
              openDestinationFlyout(destinationId);
            }}
            onShowOnCanvas={showOnCanvas}
            onRequestDelete={setDestinationPendingDeletion}
            onIndexClick={openIndexDetail}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isCreateModalOpen && (
        <CreateDestinationModal destinations={destinationsController} onClose={closeCreateModal} />
      )}
      {destinationPendingDeletion && (
        <DeleteDestinationConfirmation
          destinationName={destinationPendingDeletion.name}
          onCancel={cancelDeletion}
          onConfirm={confirmDeletion}
        />
      )}
      {selectedDestination && !indexFlyoutName && (
        <UnitDestinationFlyout
          key={selectedDestination.id}
          destination={selectedDestination}
          onClose={closeDestinationFlyout}
          isDeleteDisabled={isUnitSaving}
          onIndexClick={openIndexDetail}
          onDelete={() => {
            destinationsController.deleteDestination(selectedDestination.id);
            closeDestinationFlyout();
          }}
        />
      )}
      {indexFlyoutName && (
        <StreamFlyout name={indexFlyoutName} onClose={() => setIndexFlyoutName(undefined)} />
      )}
    </>
  );
};
