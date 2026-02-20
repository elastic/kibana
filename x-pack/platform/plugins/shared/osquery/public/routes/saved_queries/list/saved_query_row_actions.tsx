/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { useHistory } from 'react-router-dom';

import { useKibana } from '../../../common/lib/kibana';
import { useCopySavedQuery } from '../../../saved_queries/use_copy_saved_query';
import { useDeleteSavedQuery } from '../../../saved_queries/use_delete_saved_query';
import { RowActionsMenu } from '../../../components/row_actions_menu';
import type { SavedQuerySO } from '.';

interface SavedQueryRowActionsProps {
  item: SavedQuerySO;
}

const DELETE_MODAL_CONFIG = {
  titleMessageId: 'xpack.osquery.savedQueryList.deleteConfirmationModal.title',
  titleDefaultMessage: 'Are you sure you want to delete this query?',
  bodyMessageId: 'xpack.osquery.savedQueryList.deleteConfirmationModal.body',
  bodyDefaultMessage: "You're about to delete this query. Are you sure you want to do this?",
  cancelMessageId: 'xpack.osquery.savedQueryList.deleteConfirmationModal.cancelButtonLabel',
  cancelDefaultMessage: 'Cancel',
  confirmMessageId: 'xpack.osquery.savedQueryList.deleteConfirmationModal.confirmButtonLabel',
  confirmDefaultMessage: 'Confirm',
};

const SavedQueryRowActionsComponent: React.FC<SavedQueryRowActionsProps> = ({ item }) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { push } = useHistory();

  const copySavedQueryMutation = useCopySavedQuery({
    savedQueryId: item.saved_object_id,
  });
  const deleteSavedQueryMutation = useDeleteSavedQuery({
    savedQueryId: item.saved_object_id,
  });

  const handleEdit = useCallback(() => {
    push(`/saved_queries/${item.saved_object_id}`);
  }, [push, item.saved_object_id]);

  const handleDuplicate = useCallback(() => {
    copySavedQueryMutation.mutateAsync();
  }, [copySavedQueryMutation]);

  const handleDelete = useCallback(
    () => deleteSavedQueryMutation.mutateAsync(),
    [deleteSavedQueryMutation]
  );

  const actionsAriaLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.savedQueryList.rowActions.ariaLabel', {
        defaultMessage: 'Actions for {queryName}',
        values: { queryName: item.id },
      }),
    [item.id]
  );

  const editLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.savedQueryList.rowActions.editLabel', {
        defaultMessage: 'Edit query',
      }),
    []
  );

  const duplicateLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.savedQueryList.rowActions.duplicateLabel', {
        defaultMessage: 'Duplicate query',
      }),
    []
  );

  const deleteLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.savedQueryList.rowActions.deleteLabel', {
        defaultMessage: 'Delete query',
      }),
    []
  );

  return (
    <RowActionsMenu
      itemName={item.id}
      actionsAriaLabel={actionsAriaLabel}
      editLabel={editLabel}
      duplicateLabel={duplicateLabel}
      deleteLabel={deleteLabel}
      deleteModalConfig={DELETE_MODAL_CONFIG}
      canWrite={!!permissions.writeSavedQueries}
      isReadOnly={!!item.prebuilt}
      onEdit={handleEdit}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );
};

export const SavedQueryRowActions = React.memo(SavedQueryRowActionsComponent);
