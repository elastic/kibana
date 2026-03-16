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
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { useGetTaskTemplates } from '../../containers/use_get_task_templates';
import { useApplyTaskTemplate } from '../../containers/use_apply_task_template';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';

interface ApplyTemplateModalProps {
  caseId: string;
  onClose: () => void;
}

export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({ caseId, onClose }) => {
  const { owner } = useCasesContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading: isLoadingTemplates } = useGetTaskTemplates({ owners: owner });
  const { mutate: applyTemplate, isLoading: isApplying, isError } = useApplyTaskTemplate();

  const templates = data?.templates ?? [];

  const options: Array<EuiSelectableOption<{ templateId: string }>> = templates.map((t) => ({
    label: t.name,
    key: t.id,
    templateId: t.id,
    checked: selectedId === t.id ? 'on' : undefined,
    append: (
      <EuiText size="xs" color="subdued">
        {t.tasks?.length ?? 0} {t.tasks?.length === 1 ? 'task' : 'tasks'}
      </EuiText>
    ),
  }));

  const handleChange = (newOptions: Array<EuiSelectableOption<{ templateId: string }>>) => {
    const selected = newOptions.find((o) => o.checked === 'on');
    setSelectedId(selected?.key ?? null);
  };

  const handleApply = () => {
    if (!selectedId) return;
    applyTemplate(
      { caseId, templateId: selectedId, owner: owner[0] ?? 'cases' },
      { onSuccess: onClose }
    );
  };

  return (
    <EuiModal onClose={onClose} style={{ minWidth: 480 }} data-test-subj="cases-apply-template-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.APPLY_TEMPLATE}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {isError && (
          <EuiCallOut title={i18n.APPLY_TEMPLATE_ERROR} color="danger" iconType="error" />
        )}

        {isLoadingTemplates ? (
          <EuiSkeletonText lines={4} />
        ) : templates.length === 0 ? (
          <EuiEmptyPrompt
            iconType="documents"
            title={<h3>{i18n.NO_TASK_TEMPLATES_AVAILABLE}</h3>}
            body={<p>{i18n.NO_TASK_TEMPLATES_AVAILABLE_DESCRIPTION}</p>}
            titleSize="xs"
            data-test-subj="cases-apply-template-empty"
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {i18n.APPLY_TEMPLATE_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSelectable<{ templateId: string }>
                options={options}
                onChange={handleChange}
                singleSelection
                listProps={{ bordered: true, rowHeight: 40 }}
                data-test-subj="cases-apply-template-selectable"
              >
                {(list) => list}
              </EuiSelectable>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="cases-apply-template-cancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleApply}
          isDisabled={!selectedId || templates.length === 0}
          isLoading={isApplying}
          data-test-subj="cases-apply-template-confirm"
        >
          {i18n.APPLY_TEMPLATE_CONFIRM}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
