/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { AiIndexAutomation } from '../../../../common/http_api/ai_indices';
import { ItemRow } from '../item_row';
import { WorkflowYamlPreviewFlyout } from './workflow_yaml_preview_flyout';

interface AutomationRowProps {
  automation: AiIndexAutomation;
  name: string | undefined;
  enabled: boolean | undefined;
  editHref: string;
  isEditing: boolean;
  isRemoveDisabled: boolean;
  onRemove: () => void;
}

export const AutomationRow = ({
  automation,
  name,
  enabled,
  editHref,
  isEditing,
  isRemoveDisabled,
  onRemove,
}: AutomationRowProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const displayName = name ?? automation.value;
  const previewLabel = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.automations.previewWorkflowAriaLabel',
    { defaultMessage: 'Preview workflow YAML for {name}', values: { name: displayName } }
  );
  const removeLabel = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.automations.removeButtonAriaLabel',
    { defaultMessage: 'Remove automation {name}', values: { name: displayName } }
  );

  return (
    <>
      <ItemRow
        label={displayName}
        icon={<EuiIcon type="tablePlay" size="l" aria-hidden={true} />}
        badge={
          enabled !== undefined ? (
            <EuiBadge color={enabled ? 'success' : 'hollow'}>
              {enabled
                ? i18n.translate('xpack.contextEngine.aiIndexDetail.automations.enabledBadge', {
                    defaultMessage: 'Enabled',
                  })
                : i18n.translate('xpack.contextEngine.aiIndexDetail.automations.disabledBadge', {
                    defaultMessage: 'Disabled',
                  })}
            </EuiBadge>
          ) : undefined
        }
        actions={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={previewLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="eye"
                  aria-label={previewLabel}
                  onClick={() => setIsPreviewOpen(true)}
                  data-test-subj="contextPreviewWorkflowButton"
                  {...getEbtProps({
                    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
                    action: CONTEXT_ENGINE_UI_EBT.action.automations.PREVIEW_WORKFLOW,
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
            {isEditing ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="external"
                    iconSide="right"
                    href={editHref}
                    title={i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.automations.editWorkflowTooltip',
                      { defaultMessage: 'Opens the workflow editor' }
                    )}
                    aria-label={i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.automations.editWorkflowAriaLabel',
                      { defaultMessage: 'Edit workflow in editor' }
                    )}
                    data-test-subj="contextOpenWorkflowButton"
                    {...getEbtProps({
                      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
                      action: CONTEXT_ENGINE_UI_EBT.action.automations.OPEN_WORKFLOW,
                    })}
                  >
                    {i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.automations.editWorkflowButton',
                      { defaultMessage: 'Edit workflow' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      onClick={onRemove}
                      isDisabled={isRemoveDisabled}
                      data-test-subj="contextRemoveAutomationButton"
                      aria-label={removeLabel}
                      {...getEbtProps({
                        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
                        action: CONTEXT_ENGINE_UI_EBT.action.automations.REMOVE,
                      })}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>
        }
        data-test-subj="contextAiIndexAutomationRow"
      />
      {isPreviewOpen ? (
        <WorkflowYamlPreviewFlyout
          workflowId={automation.value}
          workflowName={displayName}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </>
  );
};
