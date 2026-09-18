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
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { AiIndexAutomation } from '../../../../common/http_api/ai_indices';
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
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextAiIndexAutomationRow">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="indexRuntime" size="l" aria-hidden={true} />
        </EuiFlexItem>
        {/* minWidth: 0 lets the flex item shrink so long names truncate instead of overflowing the panel */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate">
            {displayName}
          </EuiText>
        </EuiFlexItem>
        {enabled !== undefined && (
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
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={previewLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="eye"
              aria-label={previewLabel}
              onClick={() => setIsPreviewOpen(true)}
              data-test-subj="contextPreviewWorkflowButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
        {isEditing && (
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
                />
              </EuiToolTip>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {isPreviewOpen ? (
        <WorkflowYamlPreviewFlyout
          workflowId={automation.value}
          workflowName={displayName}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </EuiPanel>
  );
};
