/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiButtonIcon, EuiPopover, EuiContextMenu, EuiIcon, EuiTextColor } from '@elastic/eui';
import type { Observable } from '../../../common/types/domain/observable/v1';
import * as i18n from './translations';

import { useCasesContext } from '../cases_context/use_cases_context';
import { DeleteAttachmentConfirmationModal } from '../user_actions/delete_attachment_confirmation_modal';
import { useDeletePropertyAction } from '../user_actions/property_actions/use_delete_property_action';
import { type CaseUI } from '../../containers/types';
import { EditObservableModal } from './edit_observable_modal';
import { useDeleteObservable } from '../../containers/use_delete_observables';

export const ObservableActionsPopoverButton: React.FC<{
  caseData: CaseUI;
  observable: Observable;
}> = ({ caseData, observable }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { permissions } = useCasesContext();
  const [showEditModal, setShowEditModal] = useState(false);

  const { isLoading: isDeleteLoading, mutateAsync: deleteObservable } = useDeleteObservable(
    caseData.id,
    observable.id
  );

  const isLoading = isDeleteLoading;

  const {
    showDeletionModal,
    onModalOpen: onDeletionModalOpen,
    onConfirm,
    onCancel,
  } = useDeletePropertyAction({
    onDelete: () => {
      deleteObservable();
    },
  });

  const tooglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const panels = useMemo((): EuiContextMenuPanelDescriptor[] => {
    const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [];

    const panelsToBuild = [
      {
        id: 0,
        title: i18n.OBSERVABLE_ACTIONS,
        items: mainPanelItems,
      },
    ];

    if (permissions.update) {
      mainPanelItems.push({
        name: <EuiTextColor color={'danger'}>{i18n.DELETE_OBSERVABLE}</EuiTextColor>,
        icon: <EuiIcon type="trash" size="m" color={'danger'} />,
        onClick: () => {
          closePopover();
          onDeletionModalOpen();
        },
        disabled: isLoading,
        'data-test-subj': 'cases-observables-delete-button',
      });

      mainPanelItems.push({
        name: <EuiTextColor>{i18n.EDIT_OBSERVABLE}</EuiTextColor>,
        icon: <EuiIcon type="pencil" size="m" />,
        onClick: () => {
          setShowEditModal(true);
          closePopover();
        },
        disabled: isLoading,
        'data-test-subj': 'cases-observables-edit-button',
      });
    }

    return panelsToBuild;
  }, [closePopover, isLoading, onDeletionModalOpen, permissions]);

  return (
    <>
      <EuiPopover
        id={`cases-observables-popover-${observable.id}`}
        key={`cases-observables-popover-${observable.id}`}
        data-test-subj={`cases-observables-popover-${observable.id}`}
        button={
          <EuiButtonIcon
            onClick={tooglePopover}
            iconType="boxesHorizontal"
            aria-label={i18n.OBSERVABLE_ACTIONS}
            color="text"
            key={`cases-observables-actions-popover-button-${observable.id}`}
            data-test-subj={`cases-observables-actions-popover-button-${observable.id}`}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={panels}
          data-test-subj={'cases-observables-popover-context-menu'}
        />
      </EuiPopover>
      {showDeletionModal && (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_OBSERVABLE_CONFIRM}
          confirmButtonText={i18n.DELETE_OBSERVABLE}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
      {showEditModal && (
        <EditObservableModal
          caseData={caseData}
          observable={observable}
          onCloseModal={() => setShowEditModal(false)}
        />
      )}
    </>
  );
};

ObservableActionsPopoverButton.displayName = 'FileActionsPopoverButton';
