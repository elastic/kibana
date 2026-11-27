/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useTaskLists, useTemplateTaskLists } from '../../hooks';
import { ICONS } from '../../icons';
import { LinkedTaskListBadges } from './linked_task_list_badges';
import { TemplateTaskListsPicker } from './template_task_lists_picker';
import * as i18n from './translations';

export interface TemplateTaskListsSectionProps {
  templateId: string;
  templateName: string;
}

/** The "Task lists" strip of the template edit page: the linked lists and the picker. */
export const TemplateTaskListsSection: React.FC<TemplateTaskListsSectionProps> = ({
  templateId,
  templateName,
}) => {
  const { euiTheme } = useEuiTheme();
  const linksQuery = useTemplateTaskLists(templateId);
  const taskListsQuery = useTaskLists();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.base};
        border-block-end: ${euiTheme.border.thin};
      `}
      data-test-subj="investigationTemplateTaskListsSection"
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{i18n.COLUMN_TASK_LISTS}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LinkedTaskListBadges
            taskListIds={linksQuery.data?.task_list_ids ?? []}
            taskLists={taskListsQuery.data?.task_lists ?? []}
            data-test-subj="investigationTemplateTaskListsSectionBadges"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType={ICONS.procedure}
            aria-label={i18n.TASK_LISTS_BUTTON_ARIA(templateName)}
            onClick={() => setIsPickerOpen(true)}
            data-test-subj="investigationTemplateSectionEditTasks"
          >
            {i18n.TASK_LISTS_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.TEMPLATE_TASK_LISTS_HELP}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPickerOpen ? (
        <TemplateTaskListsPicker
          templateId={templateId}
          templateName={templateName}
          onClose={() => setIsPickerOpen(false)}
        />
      ) : null}
    </div>
  );
};
TemplateTaskListsSection.displayName = 'TemplateTaskListsSection';
