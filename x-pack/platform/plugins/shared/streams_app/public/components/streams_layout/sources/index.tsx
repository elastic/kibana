/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IntegrationCardItem } from '@kbn/ingest-hub-plugin/public';
import { useNavigateToCanvasSearch } from '../../stream_management/data_management/stream_detail_canvas/use_navigate_to_canvas_search';
import { useSourcesTable } from './sources_context';
import type { SourceViewModel } from './types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';
import { CreateSourceModal } from './create_source_modal';
import { SourceDetailsFlyout } from './source_details_flyout';
import { DeleteSourcesConfirmation } from './delete_sources_confirmation';
import { getSourceDisplaySignals } from './source_models';
import { getSourceSortableValue } from './source_grid_cell';
import { SourcesGrid } from './sources_grid';
import { SourcesToolbar } from './sources_toolbar';
import { AddSourceChooserModal } from './add_source_chooser_modal';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useKibana } from '../../../hooks/use_kibana';
import { UnitReadOnlyCallout } from '../unit_read_only_callout';

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
    sortingColumns,
    pagination,
    visibleColumnIds,
    availableSourceTypes,
    deleteSources,
    refreshUnit,
    setQuery,
    setSelectedSources,
    setSelectedTypes,
    setSortingColumns,
    setPagination,
    setVisibleColumnIds,
    openCreateModal,
    closeCreateModal,
    openSourceFlyout,
    closeSourceFlyout,
    isUnitSaving,
  } = sourcesController;

  const {
    v2: { manage: canManage },
  } = useStreamsPrivileges();
  const {
    dependencies: {
      start: { ingestHub },
    },
    core: { notifications },
  } = useKibana();
  // POC (elastic/ingest-dev#10466): "Add source" opens a chooser; its Integration card opens the
  // integrations catalogue, which Ingest Hub composes out of Fleet's browse page.
  const [addSourceView, setAddSourceView] = useState<'none' | 'chooser' | 'catalogue'>('none');
  const AddIntegrationModal = ingestHub?.AddIntegrationModal;
  const onIntegrationSelected = useCallback(
    (card: IntegrationCardItem) => {
      setAddSourceView('none');
      notifications.toasts.addInfo({
        title: i18n.translate('xpack.streams.sources.integrationSelectedToastTitle', {
          defaultMessage: 'Selected {title}',
          values: { title: card.title },
        }),
        text: i18n.translate('xpack.streams.sources.integrationSelectedToastText', {
          defaultMessage:
            'POC only: the onboarding wizard is not wired up, and no source was created.',
        }),
      });
    },
    [notifications.toasts]
  );
  const [sourcesPendingDeletion, setSourcesPendingDeletion] = useState<SourceViewModel[]>([]);
  const navigateToCanvasSearch = useNavigateToCanvasSearch();
  const showOnCanvas = useCallback(
    (source: SourceViewModel) => navigateToCanvasSearch(source.name ?? source.id),
    [navigateToCanvasSearch]
  );

  const typeFilterOptions = useMemo(
    () =>
      Array.from(new Set(sources.map(({ type }) => type))).map((type) => ({
        key: type,
        label: SOURCE_TYPE_CONFIG_BY_TYPE[type].shortLabel,
      })),
    [sources]
  );

  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sources.filter(
      (source) =>
        (!normalizedQuery ||
          [
            source.name ?? source.id,
            source.id,
            SOURCE_TYPE_CONFIG_BY_TYPE[source.type].label,
            ...getSourceDisplaySignals(source, source.supportedTelemetry),
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)) &&
        (selectedTypes.length === 0 || selectedTypes.includes(source.type))
    );
  }, [query, selectedTypes, sources]);

  const sortedSources = useMemo(() => {
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
          {!canManage && (
            <>
              <UnitReadOnlyCallout />
              <EuiSpacer size="m" />
            </>
          )}
          <SourcesToolbar
            query={query}
            typeOptions={typeFilterOptions}
            selectedTypes={selectedTypes}
            isRefreshing={isRefreshingUnit}
            onQueryChange={setQuery}
            onSelectedTypesChange={setSelectedTypes}
            onRefresh={refreshUnit}
            onAddSource={canManage ? () => setAddSourceView('chooser') : undefined}
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
          <SourcesGrid
            status={isLoadingUnit ? 'loading' : isUnitUnavailable ? 'unavailable' : 'ready'}
            sources={sortedSources}
            selectedSources={selectedSources}
            hasActiveFilters={query.trim().length > 0 || selectedTypes.length > 0}
            visibleColumns={visibleColumnIds}
            pagination={pagination}
            sortingColumns={sortingColumns}
            onVisibleColumnsChange={setVisibleColumnIds}
            onPaginationChange={setPagination}
            onSortingChange={setSortingColumns}
            onSelectionChange={setSelectedSources}
            onOpenSource={openSourceFlyout}
            onShowOnCanvas={showOnCanvas}
            onRequestDelete={canManage ? setSourcesPendingDeletion : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {canManage && addSourceView === 'chooser' && (
        <AddSourceChooserModal
          availableSourceTypes={availableSourceTypes}
          onBrowseIntegrations={() => setAddSourceView('catalogue')}
          onUseIngestApi={() => {
            setAddSourceView('none');
            openCreateModal();
          }}
          onClose={() => setAddSourceView('none')}
        />
      )}
      {canManage && addSourceView === 'catalogue' && AddIntegrationModal && (
        <Suspense fallback={<EuiLoadingSpinner size="l" />}>
          <AddIntegrationModal
            onClose={() => setAddSourceView('none')}
            onIntegrationSelected={onIntegrationSelected}
            title={i18n.translate('xpack.streams.sources.addIntegrationModalTitle', {
              defaultMessage: 'Add data',
            })}
            subtitle={i18n.translate('xpack.streams.sources.addIntegrationModalSubtitle', {
              defaultMessage: 'Choose a technology to start collecting from',
            })}
            calloutAction={{
              text: i18n.translate('xpack.streams.sources.addIntegrationModalCalloutText', {
                defaultMessage:
                  'Already sending with an OTel collector, Prometheus or Logstash? Send to an Ingest API instead.',
              }),
              label: i18n.translate('xpack.streams.sources.addIntegrationModalCalloutLabel', {
                defaultMessage: 'Get an endpoint',
              }),
              onClick: () => setAddSourceView('chooser'),
            }}
          />
        </Suspense>
      )}
      {canManage && isCreateModalOpen && (
        <CreateSourceModal sources={sourcesController} onClose={closeCreateModal} />
      )}
      {selectedSource && (
        <SourceDetailsFlyout
          sources={sourcesController}
          source={selectedSource}
          onClose={closeSourceFlyout}
          readOnly={!canManage}
        />
      )}
      {sourcesPendingDeletion.length > 0 && (
        <DeleteSourcesConfirmation
          count={sourcesPendingDeletion.length}
          onCancel={() => setSourcesPendingDeletion([])}
          onConfirm={() => {
            deleteSources(sourcesPendingDeletion.map(({ id }) => id));
            setSelectedSources([]);
            setSourcesPendingDeletion([]);
          }}
        />
      )}
    </>
  );
};
