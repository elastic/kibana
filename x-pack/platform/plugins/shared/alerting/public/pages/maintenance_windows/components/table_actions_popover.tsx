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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from '../translations';
import type { MaintenanceWindowStatus } from '../../../../common';
import { useKibana } from '../../../utils/kibana_react';

export interface TableActionsPopoverProps {
  id: string;
  status: MaintenanceWindowStatus;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onCancelAndArchive: (id: string) => void;
  onDelete: (id: string) => void;
}
type ModalType = 'cancel' | 'cancelAndArchive' | 'archive' | 'unarchive' | 'delete';
type ActionType = ModalType | 'edit' | 'copyId';

export const TableActionsPopover: React.FC<TableActionsPopoverProps> = React.memo(
  ({ id, status, isLoading, onEdit, onCancel, onArchive, onCancelAndArchive, onDelete }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<ModalType>();
    const modalTitleId = useGeneratedHtmlId();

    const {
      notifications: { toasts },
    } = useKibana().services;

    const onButtonClick = useCallback(() => {
      setIsPopoverOpen((open) => !open);
    }, []);
    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const closeModal = useCallback(() => setIsModalVisible(false), []);
    const showModal = useCallback((type: ModalType) => {
      setModalType(type);
      setIsModalVisible(true);
    }, []);

    const modal = useMemo(() => {
      const modals = {
        cancel: {
          props: {
            title: i18n.CANCEL_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onCancel(id);
            },
            cancelButtonText: i18n.CANCEL_MODAL_BUTTON,
            confirmButtonText: i18n.CANCEL_MODAL_TITLE,
          },
          subtitle: i18n.CANCEL_MODAL_SUBTITLE,
        },
        cancelAndArchive: {
          props: {
            title: i18n.CANCEL_AND_ARCHIVE_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onCancelAndArchive(id);
            },
            cancelButtonText: i18n.CANCEL_MODAL_BUTTON,
            confirmButtonText: i18n.CANCEL_AND_ARCHIVE_MODAL_TITLE,
          },
          subtitle: i18n.CANCEL_AND_ARCHIVE_MODAL_SUBTITLE,
        },
        archive: {
          props: {
            title: i18n.ARCHIVE_TITLE,
            onConfirm: () => {
              closeModal();
              onArchive(id, true);
            },
            cancelButtonText: i18n.CANCEL,
            confirmButtonText: i18n.ARCHIVE_TITLE,
          },
          subtitle: i18n.ARCHIVE_SUBTITLE,
        },
        unarchive: {
          props: {
            title: i18n.UNARCHIVE_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onArchive(id, false);
            },
            cancelButtonText: i18n.CANCEL,
            confirmButtonText: i18n.UNARCHIVE_MODAL_TITLE,
          },
          subtitle: i18n.UNARCHIVE_MODAL_SUBTITLE,
        },
        delete: {
          props: {
            title: i18n.DELETE_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onDelete(id);
            },
            cancelButtonText: i18n.CANCEL,
            confirmButtonText: i18n.DELETE_MODAL_TITLE,
          },
          subtitle: i18n.DELETE_MODAL_SUBTITLE,
        },
      };
      let m;
      if (isModalVisible && modalType) {
        const modalProps = modals[modalType];
        m = (
          <EuiConfirmModal
            {...modalProps.props}
            style={{ width: 600 }}
            onCancel={closeModal}
            defaultFocusedButton="confirm"
            buttonColor="danger"
            aria-labelledby={modalTitleId}
            titleProps={{ id: modalTitleId }}
          >
            <p>{modalProps.subtitle}</p>
          </EuiConfirmModal>
        );
      }
      return m;
    }, [
      id,
      modalType,
      isModalVisible,
      closeModal,
      onArchive,
      onCancel,
      onCancelAndArchive,
      onDelete,
      modalTitleId,
    ]);

    const items = useMemo(() => {
      const menuItems = {
        edit: (
          <EuiContextMenuItem
            data-test-subj="table-actions-edit"
            key="edit"
            icon="pencil"
            onClick={() => {
              closePopover();
              onEdit(id);
            }}
          >
            {i18n.TABLE_ACTION_EDIT}
          </EuiContextMenuItem>
        ),
        copyId: (
          <EuiContextMenuItem
            data-test-subj="table-actions-copy-id"
            key="copy-id"
            icon="copyClipboard"
            onClick={() => {
              closePopover();
              navigator.clipboard.writeText(id).then(() => {
                toasts.addSuccess(i18n.COPY_ID_ACTION_SUCCESS);
              });
            }}
          >
            {i18n.COPY_ID}
          </EuiContextMenuItem>
        ),
        cancel: (
          <EuiContextMenuItem
            data-test-subj="table-actions-cancel"
            key="cancel"
            icon="stopSlash"
            onClick={() => {
              closePopover();
              showModal('cancel');
            }}
          >
            {i18n.TABLE_ACTION_CANCEL}
          </EuiContextMenuItem>
        ),
        cancelAndArchive: (
          <EuiContextMenuItem
            data-test-subj="table-actions-cancel-and-archive"
            key="cancel-and-archive"
            icon="folderOpen"
            onClick={() => {
              closePopover();
              showModal('cancelAndArchive');
            }}
          >
            {i18n.TABLE_ACTION_CANCEL_AND_ARCHIVE}
          </EuiContextMenuItem>
        ),
        archive: (
          <EuiContextMenuItem
            data-test-subj="table-actions-archive"
            key="archive"
            icon="folderOpen"
            onClick={() => {
              closePopover();
              showModal('archive');
            }}
          >
            {i18n.ARCHIVE}
          </EuiContextMenuItem>
        ),
        unarchive: (
          <EuiContextMenuItem
            data-test-subj="table-actions-unarchive"
            key="unarchive"
            icon="exit"
            onClick={() => {
              closePopover();
              showModal('unarchive');
            }}
          >
            {i18n.TABLE_ACTION_UNARCHIVE}
          </EuiContextMenuItem>
        ),
        delete: (
          <EuiContextMenuItem
            data-test-subj="table-actions-delete"
            key="delete"
            icon="trash"
            onClick={() => {
              closePopover();
              showModal('delete');
            }}
          >
            {i18n.TABLE_ACTION_DELETE}
          </EuiContextMenuItem>
        ),
      };
      const statusMenuItemsMap: Record<MaintenanceWindowStatus, ActionType[]> = {
        running: ['edit', 'copyId', 'cancel', 'cancelAndArchive', 'delete'],
        upcoming: ['edit', 'copyId', 'archive', 'delete'],
        finished: ['edit', 'copyId', 'archive', 'delete'],
        archived: ['copyId', 'unarchive', 'delete'],
      };
      return statusMenuItemsMap[status].map((type) => menuItems[type]);
    }, [status, closePopover, onEdit, id, toasts, showModal]);

    const button = useMemo(
      () => (
        <EuiButtonIcon
          isDisabled={isLoading}
          data-test-subj="table-actions-icon-button"
          iconType="boxesHorizontal"
          size="s"
          aria-label="Upcoming events"
          onClick={onButtonClick}
        />
      ),
      [isLoading, onButtonClick]
    );

    return (
      <>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={button}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downCenter"
              data-test-subj="table-actions-popover"
            >
              <EuiContextMenuPanel items={items} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
        {modal}
      </>
    );
  }
);
TableActionsPopover.displayName = 'TableActionsPopover';