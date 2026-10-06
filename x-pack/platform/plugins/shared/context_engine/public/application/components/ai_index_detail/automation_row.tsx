/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { AiIndexAutomation } from '../../../../common/http_api/ai_indices';
import { useAutomationRowMenuItems } from '../../hooks/use_automation_row_menu_items';
import { ItemRow } from '../item_row';
import { ItemRowIcon } from '../item_row_icon';
import { AutomationDeleteConfirmModal } from './automation_delete_confirm_modal';
import { WorkflowYamlPreviewFlyout } from './workflow_yaml_preview_flyout';

interface AutomationRowProps {
  automation: AiIndexAutomation;
  name: string | undefined;
  enabled: boolean | undefined;
  editHref: string;
  isReadOnly: boolean;
  isDisabled: boolean;
  onDelete: () => Promise<boolean>;
}

export const AutomationRow = ({
  automation,
  name,
  enabled,
  editHref,
  isReadOnly,
  isDisabled,
  onDelete,
}: AutomationRowProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const displayName = name ?? automation.value;
  const actionsAriaLabel = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.automations.actionsAriaLabel',
    { defaultMessage: 'Actions for {name}', values: { name: displayName } }
  );

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const openPreview = useCallback(() => setIsPreviewOpen(true), []);
  const openDeleteModal = useCallback(() => setIsDeleteModalOpen(true), []);

  const menuItems = useAutomationRowMenuItems({
    editHref,
    isReadOnly,
    isDisabled,
    onCloseMenu: closeMenu,
    onPreview: openPreview,
    onDelete: openDeleteModal,
  });

  return (
    <>
      <ItemRow
        label={displayName}
        icon={<ItemRowIcon iconType="workflow" />}
        actions={
          <EuiPopover
            panelPaddingSize="none"
            anchorPosition="downRight"
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            aria-label={actionsAriaLabel}
            button={
              <EuiToolTip content={actionsAriaLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="ellipsis"
                  color="text"
                  aria-label={actionsAriaLabel}
                  onClick={() => setIsMenuOpen((open) => !open)}
                  data-test-subj="contextAutomationRowActionsButton"
                  {...getEbtProps({
                    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
                    action: CONTEXT_ENGINE_UI_EBT.action.automations.ROW_ACTIONS_MENU,
                  })}
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        }
        data-test-subj="contextAiIndexAutomationRow"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
            <EuiText size="s" className="eui-textTruncate">
              <strong>{displayName}</strong>
            </EuiText>
          </EuiFlexItem>
          {enabled !== undefined ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color={enabled ? 'success' : 'hollow'}>
                {enabled
                  ? i18n.translate('xpack.contextEngine.aiIndexDetail.automations.enabledBadge', {
                      defaultMessage: 'Enabled',
                    })
                  : i18n.translate('xpack.contextEngine.aiIndexDetail.automations.disabledBadge', {
                      defaultMessage: 'Disabled',
                    })}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </ItemRow>
      {isPreviewOpen ? (
        <WorkflowYamlPreviewFlyout
          workflowId={automation.value}
          workflowName={displayName}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
      {isDeleteModalOpen ? (
        <AutomationDeleteConfirmModal
          name={displayName}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={async () => {
            const saved = await onDelete();
            if (saved) {
              setIsDeleteModalOpen(false);
            }
          }}
        />
      ) : null}
    </>
  );
};
