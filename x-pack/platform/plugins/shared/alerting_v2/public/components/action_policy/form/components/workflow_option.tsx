/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHighlight, EuiText } from '@elastic/eui';
import type { WorkflowListDto } from '@kbn/workflows';
import {
  DISABLED_BADGE_LABEL,
  MANAGED_BADGE_LABEL,
  WORKFLOW_EMPTY_DESCRIPTION,
} from '@kbn/workflows-ui';
import React from 'react';

type WorkflowListItem = WorkflowListDto['results'][number];

export interface WorkflowOptionValue {
  id: string;
  description?: string;
  managed?: boolean;
}

export type WorkflowComboOption = EuiComboBoxOptionOption<WorkflowOptionValue>;

export const WORKFLOW_OPTION_ROW_HEIGHT = 60;

export const toWorkflowComboOption = ({
  id,
  name,
  description,
  enabled,
  managed,
}: WorkflowListItem): WorkflowComboOption => ({
  key: id,
  label: name,
  disabled: !enabled,
  value: { id, description, managed },
});

export const renderWorkflowOption = (
  { label, disabled, value }: WorkflowComboOption,
  searchValue: string
) => {
  // Plain text only: the option is a <button> in a listbox, so nested tooltips or focusable
  // badges are neither reachable by keyboard nor reliably hoverable when the option is disabled.
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <div className="eui-textTruncate">
          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        </div>
        <EuiText
          size="xs"
          color="subdued"
          className="eui-textTruncate"
          data-test-subj="workflowOptionDetails"
        >
          {value?.description || WORKFLOW_EMPTY_DESCRIPTION}
        </EuiText>
      </EuiFlexItem>
      {disabled && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="default" data-test-subj="workflowOptionDisabledBadge">
            {DISABLED_BADGE_LABEL}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {value?.managed && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{MANAGED_BADGE_LABEL}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
