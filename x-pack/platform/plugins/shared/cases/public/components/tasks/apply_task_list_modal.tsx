/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useApplyTaskTemplate, useGetTaskTemplates } from '../../containers/use_case_tasks';
import * as i18n from './translations';

export interface ApplyTaskListModalProps {
  caseId: string;
  /** Task lists already on the case; the server refuses them again, so the picker says so up front. */
  appliedTemplateIds: string[];
  onClose: () => void;
}

export const ApplyTaskListModal: React.FC<ApplyTaskListModalProps> = ({
  caseId,
  appliedTemplateIds,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { data, isLoading } = useGetTaskTemplates();
  const { mutateAsync: applyTaskTemplate, isLoading: isApplying } = useApplyTaskTemplate(caseId);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const options = (data?.templates ?? []).map((template) => {
    const applied = appliedTemplateIds.includes(template.id);
    return {
      key: template.id,
      label: template.name,
      disabled: applied,
      checked: template.id === selectedId ? ('on' as const) : undefined,
      append: (
        <EuiText size="xs" color="subdued">
          {applied
            ? i18n.ALREADY_APPLIED
            : i18n.TASK_LIST_TASK_COUNT(
                template.tasks.reduce((count, task) => count + 1 + task.subtasks.length, 0)
              )}
        </EuiText>
      ),
    };
  });

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="cases-apply-task-list-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.APPLY_TASK_LIST}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSelectable
          singleSelection
          isLoading={isLoading}
          options={options}
          onChange={(next) => setSelectedId(next.find((option) => option.checked === 'on')?.key)}
          listProps={{ bordered: true }}
          emptyMessage={i18n.NO_TASK_LISTS}
          aria-label={i18n.SELECT_TASK_LIST}
          data-test-subj="cases-task-list-options"
        >
          {(list) => list}
        </EuiSelectable>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL}</EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={!selectedId}
          isLoading={isApplying}
          onClick={async () => {
            if (selectedId) {
              await applyTaskTemplate(selectedId);
              onClose();
            }
          }}
          data-test-subj="cases-apply-task-list-submit"
        >
          {i18n.APPLY_TASK_LIST}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

ApplyTaskListModal.displayName = 'ApplyTaskListModal';
