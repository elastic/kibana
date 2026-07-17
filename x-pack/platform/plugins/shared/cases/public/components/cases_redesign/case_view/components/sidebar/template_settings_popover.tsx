/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { CaseUI } from '../../../../../../common';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { useGetTemplates } from '../../../../templates_v2/hooks/use_get_templates';
import { TEMPLATE_SELECTOR_PAGE_SIZE } from '../../../../templates_v2/constants';
import { useGetTemplate } from '../../../../templates_v2/hooks/use_get_template';
import { useChangeAppliedTemplate } from '../../../../case_view/use_change_applied_template';
import * as commonI18n from '../../../../../common/translations';
import { SidebarSectionSettingsButton } from './sidebar_section_settings_button';
import { ConfirmChangeTemplateModal } from './confirm_change_template_modal';
import type { TemplateSummary } from './confirm_change_template_modal';

export interface TemplateSettingsPopoverProps {
  caseData: CaseUI;
  'data-test-subj'?: string;
}

export const TemplateSettingsPopover: FC<TemplateSettingsPopoverProps> = ({
  caseData,
  'data-test-subj': dataTestSubj = 'sidebar-template-settings',
}) => {
  const { owner } = useCasesContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const appliedTemplateId = caseData.template?.id ?? '';

  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { data: templatesData, isLoading: isLoadingTemplates } = useGetTemplates({
    queryParams: { page: 1, perPage: TEMPLATE_SELECTOR_PAGE_SIZE, owner, isEnabled: true },
  });

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      (templatesData?.templates ?? []).map((t) => ({
        label: t.name,
        value: t.templateId,
      })),
    [templatesData?.templates]
  );

  const selectedOptions = useMemo(
    () => options.filter((o) => o.value === appliedTemplateId),
    [options, appliedTemplateId]
  );

  // `null` means no pending confirmation. An empty string represents the user
  // clearing the selection (i.e. removing the currently applied template).
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  const { data: appliedTemplateData } = useGetTemplate(
    caseData.template?.id,
    caseData.template?.version,
    { includeDeleted: true }
  );

  const { data: pendingTemplateData, isFetching: isFetchingPendingTemplate } = useGetTemplate(
    pendingTemplateId || undefined
  );

  const { mutate: changeTemplate, isLoading: isChangingTemplate } = useChangeAppliedTemplate();

  const onTemplateChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const newTemplateId = selected[0]?.value ?? '';
      if (newTemplateId === appliedTemplateId) {
        return;
      }
      setPendingTemplateId(newTemplateId);
    },
    [appliedTemplateId]
  );

  const closeConfirmModal = useCallback(() => setPendingTemplateId(null), []);

  const oldTemplateSummary: TemplateSummary | undefined = useMemo(
    () =>
      appliedTemplateData
        ? { name: appliedTemplateData.name, fieldDefinitions: appliedTemplateData.fieldDefinitions }
        : undefined,
    [appliedTemplateData]
  );

  const newTemplateSummary: TemplateSummary | undefined = useMemo(() => {
    if (!pendingTemplateId) {
      return undefined;
    }
    const template = templatesData?.templates.find((t) => t.templateId === pendingTemplateId);
    return template
      ? { name: template.name, fieldDefinitions: template.fieldDefinitions }
      : undefined;
  }, [pendingTemplateId, templatesData?.templates]);

  const isPendingNewTemplateDataReady =
    !pendingTemplateId ||
    (Boolean(pendingTemplateData) &&
      pendingTemplateData?.templateId === pendingTemplateId &&
      !isFetchingPendingTemplate);

  const onConfirmChangeTemplate = useCallback(() => {
    if (pendingTemplateId === null || !isPendingNewTemplateDataReady) {
      return;
    }

    const newTemplate =
      pendingTemplateId && pendingTemplateData
        ? {
            id: pendingTemplateData.templateId,
            version: pendingTemplateData.templateVersion,
            fields: pendingTemplateData.definition.fields,
          }
        : null;

    changeTemplate(
      { caseData, newTemplate },
      {
        onSuccess: () => {
          closeConfirmModal();
          closePopover();
        },
      }
    );
  }, [
    pendingTemplateId,
    isPendingNewTemplateDataReady,
    pendingTemplateData,
    caseData,
    changeTemplate,
    closeConfirmModal,
    closePopover,
  ]);

  return (
    <>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downRight"
        panelPaddingSize="m"
        data-test-subj={`${dataTestSubj}-popover`}
        button={
          <SidebarSectionSettingsButton data-test-subj={dataTestSubj} onClick={togglePopover} />
        }
      >
        <EuiPopoverTitle>{commonI18n.APPLY_TEMPLATE_MODAL_TEMPLATE_LABEL}</EuiPopoverTitle>
        <EuiComboBox
          fullWidth
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onTemplateChange}
          isLoading={isLoadingTemplates}
          placeholder={commonI18n.APPLY_TEMPLATE_MODAL_TEMPLATE_PLACEHOLDER}
          data-test-subj={`${dataTestSubj}-template-select`}
          compressed
        />
      </EuiPopover>
      {pendingTemplateId !== null && (
        <ConfirmChangeTemplateModal
          oldTemplate={oldTemplateSummary}
          newTemplate={newTemplateSummary}
          isLoading={isChangingTemplate}
          isConfirmDisabled={!isPendingNewTemplateDataReady}
          onConfirm={onConfirmChangeTemplate}
          onCancel={closeConfirmModal}
        />
      )}
    </>
  );
};

TemplateSettingsPopover.displayName = 'TemplateSettingsPopover';
