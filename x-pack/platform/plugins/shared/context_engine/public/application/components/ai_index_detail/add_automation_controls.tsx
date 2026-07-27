/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WorkflowListDto } from '@kbn/workflows';
import { WorkflowSelector } from '@kbn/workflows-ui';
import React, { useMemo } from 'react';

interface AddAutomationControlsProps {
  attachedWorkflowIds: string[];
  isCreating: boolean;
  isCreateDisabled: boolean;
  onAdd: (workflowId: string) => void;
  onCreate: () => void;
}

export const AddAutomationControls = ({
  attachedWorkflowIds,
  isCreating,
  isCreateDisabled,
  onAdd,
  onCreate,
}: AddAutomationControlsProps) => {
  const selectorConfig = useMemo(
    () => ({
      label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.selectorLabel', {
        defaultMessage: 'Select an existing workflow',
      }),
      // Exclude already-attached workflows so they can't be picked twice.
      filterFunction: (workflows: WorkflowListDto['results']) =>
        workflows.filter((workflow) => !attachedWorkflowIds.includes(workflow.id)),
      hideTopRowHeader: true,
    }),
    [attachedWorkflowIds]
  );

  return (
    <>
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.addExistingLabel', {
            defaultMessage: 'Add an existing automation',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <WorkflowSelector onWorkflowChange={onAdd} config={selectorConfig} />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="popout"
            iconSide="right"
            onClick={onCreate}
            isLoading={isCreating}
            isDisabled={isCreateDisabled}
            data-test-subj="contextCreateAutomationButton"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createButton', {
              defaultMessage: 'Create a new automation',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.createHint', {
              defaultMessage: 'Opens the workflow editor in a new page.',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
};
