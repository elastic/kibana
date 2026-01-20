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
import { useEditActiveSourceFlyout } from '../hooks/use_edit_active_source_flyout';
import { useCloneActiveSourceFlyout } from '../hooks/use_clone_active_source_flyout';
import type { ActiveSource } from '../../types/connector';

export const ActiveSourcesView: React.FC = () => {
  const { activeSources, isLoading } = useActiveSources();
  const [selectedSource, setSelectedSource] = useState<ActiveSource | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<ActiveSource | null>(null);
  const [sourceToClone, setSourceToClone] = useState<ActiveSource | null>(null);

  const handleCancelDelete = useCallback(() => {
    setSelectedSource(null);
    setShowDeleteModal(false);
  }, []);

  const { mutate: deleteActiveSource, isLoading: isDeleting } =
    useDeleteActiveSource(handleCancelDelete);

  const { openFlyout: openCloneFlyout, flyout: cloneFlyout } = useCloneActiveSourceFlyout({
    sourceToClone,
    onConnectorCreated: () => {
      setSourceToClone(null);
    },
  });

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

  const handleClone = useCallback(
    (source: ActiveSource) => {
      setSourceToClone(source);
      // Open the add connector flyout with pre-selected type
      // User will need to select/create credentials (no secrets cloned)
      openCloneFlyout();
    },
    [openCloneFlyout]
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
          onReconnect={() => {}}
          onEdit={handleEdit}
          onClone={handleClone}
          onDelete={handleDelete}
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
      {editFlyout}
      {cloneFlyout}
    </>
  );
};
