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
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiIcon,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { RunWorkflowPanel } from '@kbn/workflows-ui';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import { ObservablesAddedTriggerId } from '../../../common/workflows/triggers';
import type { Observable } from '../../../common/types/domain/observable/v1';
import * as i18n from './translations';

import { useCasesContext } from '../cases_context/use_cases_context';
import { DeleteAttachmentConfirmationModal } from '../user_actions/delete_attachment_confirmation_modal';
import { useDeletePropertyAction } from '../user_actions/property_actions/use_delete_property_action';
import { type CaseUI } from '../../containers/types';
import { EditObservableModal } from './edit_observable_modal';
import { useDeleteObservable } from '../../containers/use_delete_observables';
import * as workflowI18n from '../workflows/translations';

const RUN_OBSERVABLE_WORKFLOW_PANEL_ID = 'run-observable-workflow-panel';
const RUN_WORKFLOWS_PANEL_WIDTH = 400;

export const ObservableActionsPopoverButton: React.FC<{
  caseData: CaseUI;
  observable: Observable;
}> = ({ caseData, observable }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { permissions } = useCasesContext();
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const canRunWorkflow = permissions.update && workflowUIEnabled && canExecuteWorkflow;
  const [showEditModal, setShowEditModal] = useState(false);
  const buttonRef = React.useRef<HTMLAnchorElement>(null);

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

  const workflowInputs = useMemo(
    () => ({
      event: {
        caseId: caseData.id,
        owner: caseData.owner,
        observables: [
          {
            id: observable.id,
            typeKey: observable.typeKey,
            value: observable.value,
            description: observable.description ?? null,
          },
        ],
      },
    }),
    [caseData.id, caseData.owner, observable]
  );

  const panels = useMemo((): EuiContextMenuPanelDescriptor[] => {
    const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [];

    const panelsToBuild: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: i18n.OBSERVABLE_ACTIONS,
        items: mainPanelItems,
      },
    ];

    if (permissions.update) {
      if (canRunWorkflow) {
        mainPanelItems.push({
          name: <EuiTextColor>{workflowI18n.RUN_WORKFLOW}</EuiTextColor>,
          icon: <EuiIcon type="playFilled" size="m" aria-hidden={true} />,
          panel: RUN_OBSERVABLE_WORKFLOW_PANEL_ID,
          'data-test-subj': 'cases-observables-run-workflow-button',
        });
      }

      mainPanelItems.push({
        name: <EuiTextColor color={'danger'}>{i18n.DELETE_OBSERVABLE}</EuiTextColor>,
        icon: <EuiIcon type="trash" size="m" color={'danger'} aria-hidden={true} />,
        onClick: () => {
          closePopover();
          onDeletionModalOpen();
        },
        disabled: isLoading,
        'data-test-subj': 'cases-observables-delete-button',
      });

      mainPanelItems.push({
        name: <EuiTextColor>{i18n.EDIT_OBSERVABLE}</EuiTextColor>,
        icon: <EuiIcon type="pencil" size="m" aria-hidden={true} />,
        onClick: () => {
          setShowEditModal(true);
          closePopover();
        },
        disabled: isLoading,
        'data-test-subj': 'cases-observables-edit-button',
      });
    }

    if (canRunWorkflow) {
      panelsToBuild.push({
        id: RUN_OBSERVABLE_WORKFLOW_PANEL_ID,
        title: workflowI18n.SELECT_WORKFLOW_TITLE,
        width: RUN_WORKFLOWS_PANEL_WIDTH,
        content: (
          <RunWorkflowPanel
            inputs={workflowInputs}
            sortWorkflow={(a, b) =>
              // Cast to string: the @kbn/workflows trigger type union only knows about built-in
              // types; cases.* trigger types are runtime extensions not reflected there.
              Number(
                (b.definition?.triggers ?? []).some(
                  (t) => (t.type as string) === ObservablesAddedTriggerId
                )
              ) -
              Number(
                (a.definition?.triggers ?? []).some(
                  (t) => (t.type as string) === ObservablesAddedTriggerId
                )
              )
            }
            onClose={closePopover}
          />
        ),
      });
    }

    return panelsToBuild;
  }, [canRunWorkflow, closePopover, isLoading, onDeletionModalOpen, permissions, workflowInputs]);

  return (
    <>
      <EuiPopover
        aria-label={i18n.OBSERVABLE_ACTIONS}
        id={`cases-observables-popover-${observable.id}`}
        key={`cases-observables-popover-${observable.id}`}
        data-test-subj={`cases-observables-popover-${observable.id}`}
        button={
          <EuiToolTip content={i18n.OBSERVABLE_ACTIONS} disableScreenReaderOutput>
            <EuiButtonIcon
              onClick={tooglePopover}
              iconType="boxesVertical"
              aria-label={i18n.OBSERVABLE_ACTIONS}
              color="text"
              key={`cases-observables-actions-popover-button-${observable.id}`}
              data-test-subj={`cases-observables-actions-popover-button-${observable.id}`}
              buttonRef={buttonRef}
            />
          </EuiToolTip>
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
          focusButtonRef={buttonRef}
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
