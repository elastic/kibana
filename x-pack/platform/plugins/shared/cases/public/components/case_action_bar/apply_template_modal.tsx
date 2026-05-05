/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonRectangle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { CaseUI } from '../../../common';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetTemplates } from '../templates_v2/hooks/use_get_templates';
import { useGetTemplate } from '../templates_v2/hooks/use_get_template';
import { useChangeAppliedTemplate } from '../case_view/use_change_applied_template';
import * as i18n from '../../common/translations';

interface ApplyTemplateModalProps {
  caseData: CaseUI;
  onClose: () => void;
}

export const ApplyTemplateModal: FC<ApplyTemplateModalProps> = ({ caseData, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const { owner } = useCasesContext();
  const titleId = useGeneratedHtmlId();

  const { data: templatesData, isLoading: isLoadingTemplates } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner, isEnabled: true },
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(caseData.template?.id ?? '');

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      (templatesData?.templates ?? []).map((t) => ({
        key: t.templateId,
        label: t.name,
        value: t.templateId,
      })),
    [templatesData?.templates]
  );

  const selectedOptions = useMemo(
    () => options.filter((o) => o.value === selectedTemplateId),
    [options, selectedTemplateId]
  );

  const { data: selectedTemplateData, isFetching: isFetchingDefinition } = useGetTemplate(
    selectedTemplateId || undefined
  );

  const { mutate: changeTemplate, isLoading: isApplying } = useChangeAppliedTemplate();

  const onChange = useCallback((selected: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedTemplateId(selected[0]?.value ?? '');
  }, []);

  const onApply = useCallback(() => {
    if (!selectedTemplateId || !selectedTemplateData) return;

    changeTemplate(
      {
        caseData,
        newTemplate: {
          id: selectedTemplateData.templateId,
          version: selectedTemplateData.templateVersion,
          fields: selectedTemplateData.definition.fields,
        },
      },
      { onSuccess: onClose }
    );
  }, [selectedTemplateId, selectedTemplateData, changeTemplate, caseData, onClose]);

  const isApplyDisabled =
    !selectedTemplateId || isFetchingDefinition || !selectedTemplateData || isApplying;

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj="apply-template-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.APPLY_TEMPLATE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow fullWidth label={i18n.APPLY_TEMPLATE_MODAL_TEMPLATE_LABEL}>
          {isLoadingTemplates ? (
            <EuiSkeletonRectangle width="100%" height={euiTheme.size.xxl} borderRadius="m" />
          ) : (
            <EuiComboBox
              fullWidth
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={selectedOptions}
              onChange={onChange}
              isLoading={isFetchingDefinition}
              placeholder={i18n.APPLY_TEMPLATE_MODAL_TEMPLATE_PLACEHOLDER}
              data-test-subj="apply-template-modal-select"
            />
          )}
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="apply-template-modal-cancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onApply}
          isDisabled={isApplyDisabled}
          isLoading={isApplying}
          data-test-subj="apply-template-modal-apply"
        >
          {i18n.APPLY_TEMPLATE_MODAL_APPLY}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

ApplyTemplateModal.displayName = 'ApplyTemplateModal';
