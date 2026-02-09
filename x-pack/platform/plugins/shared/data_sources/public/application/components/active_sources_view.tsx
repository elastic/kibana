/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActiveSourcesTable } from './active_sources_table';
import { ConfirmDeleteActiveSourceModal } from './confirm_delete_active_source_modal';
import { useActiveSources } from '../hooks/use_active_sources';
import { useDeleteActiveSource } from '../hooks/use_delete_active_source';
import { useBulkDeleteActiveSources } from '../hooks/use_bulk_delete_active_sources';
import { useEditActiveSourceFlyout } from '../hooks/use_edit_active_source_flyout';
import type { ActiveSource } from '../../types/connector';

export const ActiveSourcesView: React.FC = () => {
  const { activeSources, isLoading } = useActiveSources();
  const [selectedSource, setSelectedSource] = useState<ActiveSource | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sourceIdsToBulkDelete, setSourceIdsToBulkDelete] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<ActiveSource | null>(null);

  const handleCancelDelete = useCallback(() => {
    setSelectedSource(null);
    setShowDeleteModal(false);
  }, []);

  const handleCancelBulkDelete = useCallback(() => {
    setSourceIdsToBulkDelete([]);
    setShowBulkDeleteModal(false);
  }, []);

  const { mutate: deleteActiveSource, isLoading: isDeleting } =
    useDeleteActiveSource(handleCancelDelete);

  const { bulkDelete, isDeleting: isBulkDeleting } =
    useBulkDeleteActiveSources(handleCancelBulkDelete);

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
    setSelectedSource(source);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedSource) {
      deleteActiveSource(selectedSource.id);
    }
  }, [selectedSource, deleteActiveSource]);

  const handleBulkDelete = useCallback((sources: ActiveSource[]) => {
    setSourceIdsToBulkDelete(sources.map((source) => source.id));
    setShowBulkDeleteModal(true);
  }, []);

  const handleConfirmBulkDelete = useCallback(() => {
    if (sourceIdsToBulkDelete.length > 0) {
      bulkDelete(sourceIdsToBulkDelete);
      setShowBulkDeleteModal(false);
      setSourceIdsToBulkDelete([]);
    }
  }, [sourceIdsToBulkDelete, bulkDelete]);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" css={css({ minHeight: 400 })}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {activeSources.length === 0 ? (
        <EuiEmptyPrompt
          iconType="database"
          title={
            <h2>
              {i18n.translate('xpack.dataSources.activeSources.emptyTitle', {
                defaultMessage: 'No active sources',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.dataSources.activeSources.emptyDescription', {
                defaultMessage: 'Connect a data source to get started',
              })}
            </p>
          }
        />
      ) : (
        <ActiveSourcesTable
          sources={activeSources}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
        />
      )}
      {showDeleteModal && selectedSource && (
        <ConfirmDeleteActiveSourceModal
          activeSource={selectedSource}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}
      {showBulkDeleteModal && sourceIdsToBulkDelete.length > 0 && (
        <ConfirmDeleteActiveSourceModal
          count={sourceIdsToBulkDelete.length}
          onConfirm={handleConfirmBulkDelete}
          onCancel={handleCancelBulkDelete}
          isDeleting={isBulkDeleting}
        />
      )}
      {editFlyout}
    </>
  );
};
