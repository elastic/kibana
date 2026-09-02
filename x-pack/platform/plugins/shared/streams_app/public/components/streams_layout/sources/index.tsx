/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useSourcesTable } from './sources_context';
import type { SourceStatus, SourceViewModel } from './types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';
import { CreateSourceModal } from './create_source_modal';
import { SourceDetailsFlyout } from './source_details_flyout';
import { DeleteSourcesConfirmation } from './delete_sources_confirmation';
import { getSourceSortableValue, SOURCE_STATUS_LABELS } from './source_grid_cell';
import { SourcesGrid } from './sources_grid';
import { SourcesToolbar } from './sources_toolbar';

export const SourcesTab = () => {
  const sourcesController = useSourcesTable();
  const {
    sources,
    query,
    selectedSource,
    selectedSources,
    isCreateModalOpen,
    isRefreshingUnit,
    isLoadingUnit,
    isUnitUnavailable,
    selectedTypes,
    selectedStatuses,
    sortingColumns,
    pagination,
    visibleColumnIds,
    deleteSource,
    refreshUnit,
    setQuery,
    setSelectedSources,
    setSelectedTypes,
    setSelectedStatuses,
    setSortingColumns,
    setPagination,
    setVisibleColumnIds,
    openCreateModal,
    closeCreateModal,
    openSourceFlyout,
    closeSourceFlyout,
  } = sourcesController;

  const [sourcesPendingDeletion, setSourcesPendingDeletion] = React.useState<SourceViewModel[]>([]);

  const typeFilterOptions = React.useMemo(
    () =>
      Array.from(new Set(sources.map(({ type }) => type))).map((type) => ({
        key: type,
        label: SOURCE_TYPE_CONFIG_BY_TYPE[type].shortLabel,
      })),
    [sources]
  );

  const statusFilterOptions = React.useMemo(
    () =>
      (Object.keys(SOURCE_STATUS_LABELS) as SourceStatus[]).map((status) => ({
        key: status,
        label: SOURCE_STATUS_LABELS[status],
      })),
    []
  );

  const filteredSources = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sources.filter(
      (source) =>
        (!normalizedQuery ||
          [source.name ?? source.id, source.id, SOURCE_TYPE_CONFIG_BY_TYPE[source.type].label]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)) &&
        (selectedTypes.length === 0 || selectedTypes.includes(source.type)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(source.status))
    );
  }, [query, selectedStatuses, selectedTypes, sources]);

  const sortedSources = React.useMemo(() => {
    const [sort] = sortingColumns;
    if (!sort) {
      return filteredSources;
    }

    return [...filteredSources].sort((a, b) => {
      const aValue = getSourceSortableValue(a, sort.id);
      const bValue = getSourceSortableValue(b, sort.id);
      const order = aValue.localeCompare(bValue);

      return sort.direction === 'asc' ? order : -order;
    });
  }, [filteredSources, sortingColumns]);

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
          <SourcesToolbar
            query={query}
            typeOptions={typeFilterOptions}
            statusOptions={statusFilterOptions}
            selectedTypes={selectedTypes}
            selectedStatuses={selectedStatuses}
            isRefreshing={isRefreshingUnit}
            onQueryChange={setQuery}
            onSelectedTypesChange={setSelectedTypes}
            onSelectedStatusesChange={setSelectedStatuses}
            onRefresh={refreshUnit}
            onAddSource={openCreateModal}
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            min-block-size: 0;
          `}
        >
          <SourcesGrid
            status={isLoadingUnit ? 'loading' : isUnitUnavailable ? 'unavailable' : 'ready'}
            sources={sortedSources}
            selectedSources={selectedSources}
            hasActiveFilters={
              query.trim().length > 0 || selectedTypes.length > 0 || selectedStatuses.length > 0
            }
            visibleColumns={visibleColumnIds}
            pagination={pagination}
            sortingColumns={sortingColumns}
            onVisibleColumnsChange={setVisibleColumnIds}
            onPaginationChange={setPagination}
            onSortingChange={setSortingColumns}
            onSelectionChange={setSelectedSources}
            onOpenSource={openSourceFlyout}
            onRequestDelete={setSourcesPendingDeletion}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isCreateModalOpen && (
        <CreateSourceModal sources={sourcesController} onClose={closeCreateModal} />
      )}
      {selectedSource && (
        <SourceDetailsFlyout
          sources={sourcesController}
          source={selectedSource}
          onClose={closeSourceFlyout}
        />
      )}
      {sourcesPendingDeletion.length > 0 && (
        <DeleteSourcesConfirmation
          count={sourcesPendingDeletion.length}
          onCancel={() => setSourcesPendingDeletion([])}
          onConfirm={() => {
            sourcesPendingDeletion.forEach(({ id }) => deleteSource(id));
            setSelectedSources([]);
            setSourcesPendingDeletion([]);
          }}
        />
      )}
    </>
  );
};
