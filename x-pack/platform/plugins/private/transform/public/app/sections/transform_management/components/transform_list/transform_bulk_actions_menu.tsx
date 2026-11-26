/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState } from 'react';

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  isProjectScopeActionDisabled,
  ProjectScopeActionFlyout,
  ProjectScopeActionModal,
  ProjectScopeActionName,
  useProjectScopeAction,
} from '../action_project_scope';
import {
  isReauthorizeActionDisabled,
  ReauthorizeActionModal,
  ReauthorizeActionName,
  useReauthorizeAction,
} from '../action_reauthorize';
import {
  DeleteActionModal,
  DeleteActionName,
  isDeleteActionDisabled,
  useDeleteAction,
} from '../action_delete';
import {
  isResetActionDisabled,
  ResetActionModal,
  ResetActionName,
  useResetAction,
} from '../action_reset';
import {
  isScheduleNowActionDisabled,
  ScheduleNowActionName,
  useScheduleNowAction,
} from '../action_schedule_now';
import {
  isStartActionDisabled,
  StartActionModal,
  StartActionName,
  useStartAction,
} from '../action_start';
import { isStopActionDisabled, StopActionName, useStopAction } from '../action_stop';
import { StopActionModal } from '../action_stop/stop_action_modal';

import type { TransformListRow } from '../../../../common';
import { useTransformCapabilities } from '../../../../hooks';

interface TransformBulkActionsMenuProps {
  items: TransformListRow[];
  onProjectScopeUpdateSuccess: (submittedItems: TransformListRow[]) => void;
  transformNodes: number;
}

export const TransformBulkActionsMenu: FC<TransformBulkActionsMenuProps> = ({
  items,
  onProjectScopeUpdateSuccess,
  transformNodes,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const capabilities = useTransformCapabilities();
  const startAction = useStartAction(false, transformNodes);
  const deleteAction = useDeleteAction(false);
  const reauthorizeAction = useReauthorizeAction(false, transformNodes);
  const resetAction = useResetAction(false);
  const stopAction = useStopAction(false);
  const scheduleNowAction = useScheduleNowAction(false, transformNodes);
  const projectScopeAction = useProjectScopeAction({
    onUpdateSuccess: onProjectScopeUpdateSuccess,
  });
  const isProjectScopeDisabled = isProjectScopeActionDisabled({
    canCreateTransform: projectScopeAction.canCreateTransform,
    hasLinkedProjects: projectScopeAction.hasLinkedProjects,
    isCpsEnabled: projectScopeAction.isCpsEnabled,
    isLoading: projectScopeAction.isLoading,
    items,
  });

  const menuItems = [
    <EuiContextMenuItem
      key="startAction"
      onClick={() => {
        setIsOpen(false);
        startAction.openModal(items);
      }}
      disabled={isStartActionDisabled(items, capabilities.canStartStopTransform, transformNodes)}
    >
      <StartActionName items={items} transformNodes={transformNodes} />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="scheduleNowAction"
      onClick={() => {
        setIsOpen(false);
        scheduleNowAction.scheduleNowTransforms(items.map((item) => ({ id: item.id })));
      }}
      disabled={isScheduleNowActionDisabled(
        items,
        capabilities.canScheduleNowTransform,
        transformNodes
      )}
    >
      <ScheduleNowActionName items={items} transformNodes={transformNodes} />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="stopAction"
      onClick={() => {
        setIsOpen(false);
        stopAction.openModal(items);
      }}
      disabled={isStopActionDisabled(items, capabilities.canStartStopTransform, false)}
    >
      <StopActionName items={items} />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="reauthorizeAction"
      onClick={() => {
        setIsOpen(false);
        reauthorizeAction.openModal(items);
      }}
      disabled={isReauthorizeActionDisabled(
        items,
        capabilities.canStartStopTransform,
        transformNodes
      )}
    >
      <ReauthorizeActionName items={items} transformNodes={transformNodes} />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="projectScopeAction"
      onClick={() => {
        setIsOpen(false);
        projectScopeAction.openFlyout(items);
      }}
      disabled={isProjectScopeDisabled}
    >
      <ProjectScopeActionName
        canCreateTransform={projectScopeAction.canCreateTransform}
        disabled={isProjectScopeDisabled}
        hasLinkedProjects={projectScopeAction.hasLinkedProjects}
        isCpsEnabled={projectScopeAction.isCpsEnabled}
        isLoading={projectScopeAction.isLoading}
        items={items}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="resetAction"
      onClick={() => {
        setIsOpen(false);
        resetAction.openModal(items);
      }}
      disabled={isResetActionDisabled(items, false)}
    >
      <ResetActionName
        canResetTransform={capabilities.canResetTransform}
        disabled={isResetActionDisabled(items, false)}
        isBulkAction={true}
        items={items}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="deleteAction"
      onClick={() => {
        setIsOpen(false);
        deleteAction.openModal(items);
      }}
      disabled={isDeleteActionDisabled(items, false)}
    >
      <DeleteActionName
        canDeleteTransform={capabilities.canDeleteTransform}
        disabled={isDeleteActionDisabled(items, false)}
        isBulkAction={true}
        items={items}
        forceDisable={false}
      />
    </EuiContextMenuItem>,
  ];

  return (
    <>
      {startAction.isModalVisible && <StartActionModal {...startAction} />}
      {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
      {reauthorizeAction.isModalVisible && <ReauthorizeActionModal {...reauthorizeAction} />}
      {resetAction.isModalVisible && <ResetActionModal {...resetAction} />}
      {stopAction.isModalVisible && <StopActionModal {...stopAction} />}
      {projectScopeAction.isFlyoutVisible && <ProjectScopeActionFlyout {...projectScopeAction} />}
      {projectScopeAction.isModalVisible && <ProjectScopeActionModal {...projectScopeAction} />}

      <EuiPopover
        id="transformBulkActionsMenu"
        aria-label={i18n.translate(
          'xpack.transform.multiTransformActionsMenu.bulkActionsPopoverAriaLabel',
          { defaultMessage: 'Bulk actions' }
        )}
        button={
          <EuiButton
            color="primary"
            data-test-subj="transformBulkActionsMenuButton"
            iconSide="right"
            iconType="chevronSingleDown"
            size="s"
            onClick={() => setIsOpen((isMenuOpen) => !isMenuOpen)}
          >
            {i18n.translate('xpack.transform.multiTransformActionsMenu.transformsCount', {
              defaultMessage: '{count} selected',
              values: { count: items.length },
            })}
          </EuiButton>
        }
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
    </>
  );
};
