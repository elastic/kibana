/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiCallOut,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonRectangle,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { CaseUI } from '../../../common';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetTemplates } from '../templates_v2/hooks/use_get_templates';
import { useGetTemplate } from '../templates_v2/hooks/use_get_template';
import { useTemplateNonGlobalFields } from '../templates_v2/hooks/use_template_non_global_fields';
import { useChangeAppliedTemplate } from '../case_view/use_change_applied_template';
import {
  EMPTY_EXTENDED_FIELDS,
  TemplateFieldsFormReady,
} from '../case_view/components/template_fields_form_ready';
import type { TemplateFieldsFormApi } from '../case_view/components/template_fields_form_ready';
import * as i18n from '../../common/translations';

// Collect non-empty form values as a snake-keyed string record for submission.
// Empty ('') and empty-array ('[]') values are dropped so absent fields fall back
// to server-side defaults / required checks rather than being sent as blanks.
const collectExtendedFieldValues = (rawValues: Record<string, unknown>): Record<string, string> =>
  Object.entries(rawValues).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== '' && value !== '[]') {
      acc[key] = String(value);
    }
    return acc;
  }, {});

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

  // Only fetch the template definition when it's in the active options list.
  // If the case's currently applied template has been soft-deleted it won't appear
  // in options, and querying for it would produce a 404 spinner that never resolves.
  const isSelectedTemplateInOptions = useMemo(
    () => Boolean(selectedTemplateId) && options.some((o) => o.value === selectedTemplateId),
    [selectedTemplateId, options]
  );

  const { data: selectedTemplateData, isFetching: isFetchingDefinition } = useGetTemplate(
    isSelectedTemplateInOptions ? selectedTemplateId : undefined
  );

  const selectedTemplateDefinitionFields = useMemo(
    () => selectedTemplateData?.definition?.fields ?? [],
    [selectedTemplateData]
  );

  const { resolvedFields, isLoading: isResolvingFields } = useTemplateNonGlobalFields(
    selectedTemplateDefinitionFields,
    caseData.owner
  );

  const formApiRef = useRef<TemplateFieldsFormApi | null>(null);

  const { mutate: changeAppliedTemplate, isLoading: isApplying } = useChangeAppliedTemplate();

  const onChange = useCallback((selected: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedTemplateId(selected[0]?.value ?? '');
  }, []);

  const onApply = useCallback(async () => {
    if (!selectedTemplateId || !selectedTemplateData) return;

    const formApi = formApiRef.current;
    if (formApi) {
      const isValid = await formApi.trigger();
      if (!isValid) return;
    }

    let extendedFields: Record<string, string> | undefined;
    if (formApi) {
      const rawValues = formApi.getValues() as Record<string, unknown>;
      extendedFields = collectExtendedFieldValues(rawValues);
    }

    changeAppliedTemplate(
      {
        caseData,
        newTemplate: {
          id: selectedTemplateData.templateId,
          version: selectedTemplateData.templateVersion,
          fields: selectedTemplateData.definition.fields,
          settings: selectedTemplateData.definition.settings,
        },
        extendedFields,
      },
      { onSuccess: onClose }
    );
  }, [selectedTemplateId, selectedTemplateData, changeAppliedTemplate, caseData, onClose]);

  const isApplyDisabled =
    !selectedTemplateId ||
    isFetchingDefinition ||
    !selectedTemplateData ||
    isApplying ||
    isResolvingFields;

  const resolvedFieldsNode =
    resolvedFields.length > 0 ? (
      <TemplateFieldsFormReady
        key={selectedTemplateId}
        resolvedFields={resolvedFields}
        extendedFields={caseData.extendedFields ?? EMPTY_EXTENDED_FIELDS}
        applyDefaults
        formApiRef={formApiRef}
      />
    ) : null;

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
        <EuiSpacer size="m" />
        <EuiCallOut
          size="s"
          iconType="info"
          title={i18n.APPLY_TEMPLATE_MODAL_CONNECTOR_NOTICE}
          data-test-subj="apply-template-modal-connector-notice"
        />
        {resolvedFieldsNode && (
          <>
            <EuiSpacer size="m" />
            {resolvedFieldsNode}
          </>
        )}
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
