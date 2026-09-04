/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface DeleteModalConfig {
  titleMessageId: string;
  titleDefaultMessage: string;
  bodyMessageId: string;
  bodyDefaultMessage: string;
  cancelMessageId: string;
  cancelDefaultMessage: string;
  confirmMessageId: string;
  confirmDefaultMessage: string;
}

interface RowActionsMenuProps {
  itemName: string;
  actionsAriaLabel: string;
  editLabel: string;
  /**
   * Label shown in place of `editLabel` when the destination page is read-only
   * for this user (see `opensReadOnlyPage`).
   */
  viewLabel: string;
  duplicateLabel: string;
  deleteLabel: string;
  deleteModalConfig: DeleteModalConfig;
  canWrite: boolean;
  /** Item is Elastic-managed and therefore cannot be deleted. */
  isDeletable: boolean;
  /**
   * Whether the page the open action navigates to renders as read-only. Decided by
   * the caller because it differs per resource: a prebuilt pack is still editable by
   * a writer (agent policies/shards), whereas a prebuilt saved query is not.
   */
  opensReadOnlyPage?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => Promise<unknown>;
}

/**
 * A shared row-actions popover menu used by both pack and saved-query list views.
 *
 * Renders edit, duplicate, and delete actions. Duplicate and delete require write
 * permissions; delete is further gated by `isReadOnly` (prebuilt / read-only items
 * cannot be deleted). A confirmation modal is shown before deletion.
 */
const RowActionsMenuComponent: React.FC<RowActionsMenuProps> = ({
  itemName,
  actionsAriaLabel,
  editLabel,
  viewLabel,
  duplicateLabel,
  deleteLabel,
  deleteModalConfig,
  canWrite,
  isDeletable,
  opensReadOnlyPage,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId();

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleEditClick = useCallback(() => {
    closePopover();
    onEdit();
  }, [closePopover, onEdit]);

  const handleDuplicateClick = useCallback(() => {
    closePopover();
    onDuplicate();
  }, [closePopover, onDuplicate]);

  const handleDeleteClick = useCallback(() => {
    closePopover();
    setIsDeleteModalVisible(true);
  }, [closePopover]);

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete().then(() => {
      handleCloseDeleteModal();
    });
  }, [onDelete, handleCloseDeleteModal]);

  const menuItems = useMemo(() => {
    // The open action navigates to the same route either way; only the affordance
    // changes, so a viewer isn't promised an edit the destination page won't allow.
    const showViewLabel = !canWrite || !!opensReadOnlyPage;
    const items = [
      <EuiContextMenuItem
        key="edit"
        icon={showViewLabel ? 'eye' : 'pencil'}
        onClick={handleEditClick}
      >
        {showViewLabel ? viewLabel : editLabel}
      </EuiContextMenuItem>,
    ];

    if (canWrite) {
      items.push(
        <EuiContextMenuItem key="duplicate" icon="copy" onClick={handleDuplicateClick}>
          {duplicateLabel}
        </EuiContextMenuItem>
      );

      if (isDeletable) {
        items.push(
          <EuiContextMenuItem key="delete" icon="trash" color="danger" onClick={handleDeleteClick}>
            {deleteLabel}
          </EuiContextMenuItem>
        );
      }
    }

    return items;
  }, [
    handleEditClick,
    handleDuplicateClick,
    handleDeleteClick,
    canWrite,
    isDeletable,
    opensReadOnlyPage,
    editLabel,
    viewLabel,
    duplicateLabel,
    deleteLabel,
  ]);

  const titleProps = useMemo(() => ({ id: confirmModalTitleId }), [confirmModalTitleId]);

  return (
    <>
      <EuiPopover
        button={
          <EuiToolTip content={actionsAriaLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="boxesVertical"
              aria-label={actionsAriaLabel}
              onClick={togglePopover}
              color="primary"
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="leftCenter"
        aria-label={actionsAriaLabel}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
      {isDeleteModalVisible && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          titleProps={titleProps}
          title={
            <FormattedMessage
              id={deleteModalConfig.titleMessageId}
              defaultMessage={deleteModalConfig.titleDefaultMessage}
            />
          }
          onCancel={handleCloseDeleteModal}
          onConfirm={handleDeleteConfirm}
          cancelButtonText={
            <FormattedMessage
              id={deleteModalConfig.cancelMessageId}
              defaultMessage={deleteModalConfig.cancelDefaultMessage}
            />
          }
          confirmButtonText={
            <FormattedMessage
              id={deleteModalConfig.confirmMessageId}
              defaultMessage={deleteModalConfig.confirmDefaultMessage}
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <FormattedMessage
            id={deleteModalConfig.bodyMessageId}
            defaultMessage={deleteModalConfig.bodyDefaultMessage}
          />
        </EuiConfirmModal>
      )}
    </>
  );
};

export const RowActionsMenu = React.memo(RowActionsMenuComponent);
