/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { useHistory } from 'react-router-dom';

import { useKibana } from '../common/lib/kibana';
import { useCopyPack } from './use_copy_pack';
import { useDeletePack } from './use_delete_pack';
import { RowActionsMenu } from '../components/row_actions_menu';
import type { PackSavedObject } from './types';

interface PackRowActionsProps {
  item: PackSavedObject & { read_only?: boolean };
}

const DELETE_MODAL_CONFIG = {
  titleMessageId: 'xpack.osquery.packList.deleteConfirmationModal.title',
  titleDefaultMessage: 'Are you sure you want to delete this pack?',
  bodyMessageId: 'xpack.osquery.packList.deleteConfirmationModal.body',
  bodyDefaultMessage: "You're about to delete this pack. Are you sure you want to do this?",
  cancelMessageId: 'xpack.osquery.packList.deleteConfirmationModal.cancelButtonLabel',
  cancelDefaultMessage: 'Cancel',
  confirmMessageId: 'xpack.osquery.packList.deleteConfirmationModal.confirmButtonLabel',
  confirmDefaultMessage: 'Confirm',
};

const PackRowActionsComponent: React.FC<PackRowActionsProps> = ({ item }) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { push } = useHistory();

  const copyPackMutation = useCopyPack({ packId: item.saved_object_id });
  const deletePackMutation = useDeletePack({ packId: item.saved_object_id });

  const handleEdit = useCallback(() => {
    push(`/packs/${item.saved_object_id}/edit`);
  }, [push, item.saved_object_id]);

  const handleDuplicate = useCallback(() => {
    copyPackMutation.mutateAsync();
  }, [copyPackMutation]);

  const handleDelete = useCallback(() => deletePackMutation.mutateAsync(), [deletePackMutation]);

  const actionsAriaLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.packList.rowActions.ariaLabel', {
        defaultMessage: 'Actions for {packName}',
        values: { packName: item.name },
      }),
    [item.name]
  );

  const editLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.packList.rowActions.editLabel', {
        defaultMessage: 'Edit pack',
      }),
    []
  );

  const duplicateLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.packList.rowActions.duplicateLabel', {
        defaultMessage: 'Duplicate pack',
      }),
    []
  );

  const deleteLabel = useMemo(
    () =>
      i18n.translate('xpack.osquery.packList.rowActions.deleteLabel', {
        defaultMessage: 'Delete pack',
      }),
    []
  );

  return (
    <RowActionsMenu
      itemName={item.name}
      actionsAriaLabel={actionsAriaLabel}
      editLabel={editLabel}
      duplicateLabel={duplicateLabel}
      deleteLabel={deleteLabel}
      deleteModalConfig={DELETE_MODAL_CONFIG}
      canWrite={!!permissions.writePacks}
      isReadOnly={!!item.read_only}
      onEdit={handleEdit}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );
};

export const PackRowActions = React.memo(PackRowActionsComponent);
