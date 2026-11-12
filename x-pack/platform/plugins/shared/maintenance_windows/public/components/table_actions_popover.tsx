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
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { css } from '@emotion/react';
import type { MaintenanceWindowStatus } from '../../common';
import * as i18n from '../translations';
import { useKibana } from '../utils/kibana_react';

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

const MANAGEMENT_ACTIONS: ActionType[] = ['edit', 'copyId'];
const LIFECYCLE_ACTIONS: ActionType[] = ['cancel', 'cancelAndArchive', 'archive', 'unarchive'];
const DESTRUCTIVE_ACTIONS: ActionType[] = ['delete'];

export const TableActionsPopover: React.FC<TableActionsPopoverProps> = React.memo(
  ({ id, status, isLoading, onEdit, onCancel, onArchive, onCancelAndArchive, onDelete }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<ModalType>();
    const modalTitleId = useGeneratedHtmlId();
    const { euiTheme } = useEuiTheme();

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
      const menuItems: Record<ActionType, EuiContextMenuPanelItemDescriptor> = {
        edit: {
          name: i18n.TABLE_ACTION_EDIT,
          icon: 'pencil',
          'data-test-subj': 'table-actions-edit',
          onClick: () => {
            closePopover();
            onEdit(id);
          },
        },
        copyId: {
          name: i18n.COPY_ID,
          icon: 'copy',
          'data-test-subj': 'table-actions-copy-id',
          onClick: () => {
            closePopover();
            navigator.clipboard.writeText(id).then(() => {
              toasts.addSuccess(i18n.COPY_ID_ACTION_SUCCESS);
            });
          },
        },
        cancel: {
          name: i18n.TABLE_ACTION_CANCEL,
          icon: 'stopSlash',
          'data-test-subj': 'table-actions-cancel',
          onClick: () => {
            closePopover();
            showModal('cancel');
          },
        },
        cancelAndArchive: {
          name: i18n.TABLE_ACTION_CANCEL_AND_ARCHIVE,
          icon: 'folderOpen',
          'data-test-subj': 'table-actions-cancel-and-archive',
          onClick: () => {
            closePopover();
            showModal('cancelAndArchive');
          },
        },
        archive: {
          name: i18n.ARCHIVE,
          icon: 'folderOpen',
          'data-test-subj': 'table-actions-archive',
          onClick: () => {
            closePopover();
            showModal('archive');
          },
        },
        unarchive: {
          name: i18n.TABLE_ACTION_UNARCHIVE,
          icon: 'logOut',
          'data-test-subj': 'table-actions-unarchive',
          onClick: () => {
            closePopover();
            showModal('unarchive');
          },
        },
        delete: {
          name: i18n.TABLE_ACTION_DELETE,
          icon: <EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />,
          css: css`
            color: ${euiTheme.colors.textDanger};
          `,
          'data-test-subj': 'table-actions-delete',
          onClick: () => {
            closePopover();
            showModal('delete');
          },
        },
      };

      const statusMenuItemsMap: Record<MaintenanceWindowStatus, ActionType[]> = {
        running: ['edit', 'copyId', 'cancel', 'cancelAndArchive', 'delete'],
        upcoming: ['edit', 'copyId', 'archive', 'delete'],
        finished: ['edit', 'copyId', 'archive', 'delete'],
        archived: ['copyId', 'unarchive', 'delete'],
        disabled: ['copyId', 'delete'],
      };

      const visibleActions = new Set(statusMenuItemsMap[status]);
      const candidateGroups = [MANAGEMENT_ACTIONS, LIFECYCLE_ACTIONS, DESTRUCTIVE_ACTIONS].map(
        (group) => group.filter((type) => visibleActions.has(type)).map((type) => menuItems[type])
      );
      const groups = candidateGroups.filter((group) => group.length > 0);

      return groups.flatMap((group, index): EuiContextMenuPanelItemDescriptor[] =>
        index === 0 ? group : [{ isSeparator: true as const, key: `separator-${index}` }, ...group]
      );
    }, [status, closePopover, onEdit, id, toasts, showModal, euiTheme.colors.textDanger]);

    const button = useMemo(
      () => (
        <EuiToolTip content={i18n.TABLE_ACTIONS} disableScreenReaderOutput>
          <EuiButtonIcon
            isDisabled={isLoading}
            data-test-subj="table-actions-icon-button"
            iconType="ellipsis"
            color="text"
            aria-label={i18n.TABLE_ACTIONS}
            onClick={onButtonClick}
          />
        </EuiToolTip>
      ),
      [isLoading, onButtonClick]
    );

    return (
      <>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={i18n.TABLE_ACTIONS_POPOVER_ARIA_LABEL}
              button={button}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downCenter"
              data-test-subj="table-actions-popover"
            >
              <EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }]} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
        {modal}
      </>
    );
  }
);
TableActionsPopover.displayName = 'TableActionsPopover';
