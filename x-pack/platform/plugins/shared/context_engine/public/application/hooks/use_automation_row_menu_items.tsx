/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';

export interface UseAutomationRowMenuItemsParams {
  editHref: string;
  isReadOnly: boolean;
  isBusy: boolean;
  canRun: boolean;
  isRunDisabled: boolean;
  onCloseMenu: () => void;
  onRun: () => void;
  onPreview: () => void;
  onDelete: () => void;
}

export const useAutomationRowMenuItems = ({
  editHref,
  isReadOnly,
  isBusy,
  canRun,
  isRunDisabled,
  onCloseMenu,
  onRun,
  onPreview,
  onDelete,
}: UseAutomationRowMenuItemsParams): React.ReactElement[] => {
  return useMemo(() => {
    const items: React.ReactElement[] = [];

    if (canRun) {
      items.push(
        <EuiContextMenuItem
          key="run"
          icon="play"
          disabled={isRunDisabled}
          data-test-subj="contextRunAutomationButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.automations.RUN_WORKFLOW,
          })}
          onClick={() => {
            onCloseMenu();
            onRun();
          }}
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.runAction', {
            defaultMessage: 'Run',
          })}
        </EuiContextMenuItem>
      );
    }

    items.push(
      <EuiContextMenuItem
        key="view"
        icon="eye"
        data-test-subj="contextPreviewWorkflowButton"
        {...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
          action: CONTEXT_ENGINE_UI_EBT.action.automations.PREVIEW_WORKFLOW,
        })}
        onClick={() => {
          onCloseMenu();
          onPreview();
        }}
      >
        {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.viewAction', {
          defaultMessage: 'View',
        })}
      </EuiContextMenuItem>
    );

    if (!isReadOnly) {
      items.push(
        <EuiContextMenuItem
          key="edit"
          icon="workflow"
          href={editHref}
          external
          data-test-subj="contextOpenWorkflowButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.automations.OPEN_WORKFLOW,
          })}
          onClick={onCloseMenu}
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.editAction', {
            defaultMessage: 'Open in Workflows',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="delete"
          icon="trash"
          disabled={isBusy}
          data-test-subj="contextRemoveAutomationButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.automations.REMOVE,
          })}
          onClick={() => {
            onCloseMenu();
            onDelete();
          }}
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.deleteAction', {
            defaultMessage: 'Delete',
          })}
        </EuiContextMenuItem>
      );
    }

    return items;
  }, [
    canRun,
    editHref,
    isBusy,
    isReadOnly,
    isRunDisabled,
    onCloseMenu,
    onDelete,
    onPreview,
    onRun,
  ]);
};
