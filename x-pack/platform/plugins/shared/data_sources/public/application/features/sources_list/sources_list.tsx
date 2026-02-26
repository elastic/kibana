/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SourcesTable } from './sources_table';
import { useActiveSources } from '../../hooks/use_active_sources';
import { useDeleteActiveSource } from '../../hooks/use_delete_active_source';
import { useBulkDeleteActiveSources } from '../../hooks/use_bulk_delete_active_sources';
import { useEditActiveSourceFlyout } from '../../hooks/use_edit_active_source_flyout';
import type { ActiveSource } from '../../../types/connector';
import { ConfirmDeleteActiveSourceModal } from '../../components/confirm_delete_active_source_modal';
import { ConfirmBulkDeleteActiveSourcesModal } from '../../components/confirm_bulk_delete_active_sources_modal';

export const SourcesList: React.FC = () => {
  const { activeSources, isLoading } = useActiveSources();
  const [selectedSources, setSelectedSources] = useState<ActiveSource[]>([]);
  const [sourceToDelete, setSourceToDelete] = useState<ActiveSource | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<ActiveSource | null>(null);

  const handleCancelDelete = useCallback(() => {
    setSourceToDelete(null);
    setShowDeleteModal(false);
  }, []);

  const handleCancelBulkDelete = useCallback(() => {
    setShowBulkDeleteModal(false);
  }, []);

  const handleBulkDeleteSuccess = useCallback(() => {
    setShowBulkDeleteModal(false);
    setSelectedSources([]);
  }, []);

  const { mutate: deleteActiveSource, isLoading: isDeleting } =
    useDeleteActiveSource(handleCancelDelete);

  const { mutate: bulkDeleteActiveSources, isLoading: isBulkDeleting } =
    useBulkDeleteActiveSources(handleBulkDeleteSuccess);

  const handleCloseEditFlyout = useCallback(() => {
    setSourceToEdit(null);
  }, []);

  const { openFlyout: openEditFlyout, flyout: editFlyout } = useEditActiveSourceFlyout({
    activeSource: sourceToEdit,
    onConnectorUpdated: handleCloseEditFlyout,
  });

  const handleEdit = useCallback(
    (source: ActiveSource) => {
      setSourceToEdit(source);
      openEditFlyout();
    },
    [openEditFlyout]
  );

  const handleDelete = useCallback((source: ActiveSource) => {
    setSourceToDelete(source);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (sourceToDelete) {
      deleteActiveSource(sourceToDelete.id);
    }
  }, [sourceToDelete, deleteActiveSource]);

  const handleBulkDelete = useCallback(() => {
    setShowBulkDeleteModal(true);
  }, []);

  const handleConfirmBulkDelete = useCallback(() => {
    bulkDeleteActiveSources(selectedSources.map((source) => source.id));
  }, [bulkDeleteActiveSources, selectedSources]);

  const handleSelectAll = useCallback(() => {
    setSelectedSources(activeSources);
  }, [activeSources]);

  const handleClearSelection = useCallback(() => {
    setSelectedSources([]);
  }, []);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (activeSources.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="database"
        title={
          <h2>
            <FormattedMessage
              id="xpack.dataSources.sources.emptyTitle"
              defaultMessage="No sources"
            />
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.dataSources.sources.emptyDescription"
              defaultMessage="Connect a data source to get started"
            />
          </EuiText>
        }
      />
    );
  }

  return (
    <>
      <SourcesTable
        sources={activeSources}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        selectedItems={selectedSources}
        onSelectionChange={setSelectedSources}
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {showDeleteModal && sourceToDelete && (
        <ConfirmDeleteActiveSourceModal
          activeSource={sourceToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}

      {showBulkDeleteModal && selectedSources.length > 0 && (
        <ConfirmBulkDeleteActiveSourcesModal
          activeSources={selectedSources}
          onConfirm={handleConfirmBulkDelete}
          onCancel={handleCancelBulkDelete}
          isDeleting={isBulkDeleting}
        />
      )}

      {editFlyout}
    </>
  );
};
