/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WorkflowListDto } from '@kbn/workflows';
import {
  DISABLED_BADGE_LABEL,
  DISABLED_WORKFLOW_TOOLTIP,
  MANAGED_BADGE_LABEL,
  MANAGED_BADGE_TOOLTIP,
  WORKFLOW_EMPTY_DESCRIPTION,
} from '@kbn/workflows-ui';
import React from 'react';

type WorkflowListItem = WorkflowListDto['results'][number];

export interface WorkflowOptionValue {
  id: string;
  description?: string;
  tags?: string[];
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
  definition,
}: WorkflowListItem): WorkflowComboOption => ({
  key: id,
  label: name,
  disabled: !enabled,
  value: { id, description, managed, tags: definition?.tags },
});

export const renderWorkflowOption = (
  { label, disabled, value }: WorkflowComboOption,
  searchValue: string
) => {
  const tags = value?.tags ?? [];

  const content = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {disabled && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="minusCircle" color="subdued" aria-label={DISABLED_BADGE_LABEL} />
        </EuiFlexItem>
      )}
      <EuiFlexItem css={{ minWidth: 0 }}>
        <div className="eui-textTruncate">
          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        </div>
        <EuiText size="xs" color="subdued" className="eui-textTruncate">
          {value?.description || WORKFLOW_EMPTY_DESCRIPTION}
        </EuiText>
      </EuiFlexItem>
      {value?.managed && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={MANAGED_BADGE_TOOLTIP}>
            <EuiBadge color="hollow" tabIndex={0}>
              {MANAGED_BADGE_LABEL}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {tags.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tags.join(', ')}>
            <EuiBadge
              color="hollow"
              iconType="tag"
              tabIndex={0}
              // EuiBadge defaults `title` to its text (the count), which adds a native tooltip.
              title=""
              aria-label={i18n.translate(
                'xpack.alertingV2.actionPolicy.form.destination.workflowTagsAriaLabel',
                { defaultMessage: 'Tags: {tags}', values: { tags: tags.join(', ') } }
              )}
              data-test-subj="workflowOptionTagsBadge"
            >
              {tags.length}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return disabled ? (
    <EuiToolTip content={DISABLED_WORKFLOW_TOOLTIP} anchorProps={{ css: { width: '100%' } }}>
      {content}
    </EuiToolTip>
  ) : (
    content
  );
};
