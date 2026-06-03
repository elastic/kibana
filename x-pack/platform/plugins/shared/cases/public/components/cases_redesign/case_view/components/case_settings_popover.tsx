/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiWrappingPopover,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { CaseUI } from '../../../../../common';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useGetTemplates } from '../../../templates_v2/hooks/use_get_templates';
import { useChangeAppliedTemplate } from '../../../case_view/use_change_applied_template';
import { useGetTemplate } from '../../../templates_v2/hooks/use_get_template';
import * as i18n from '../../../case_view/translations';
import * as commonI18n from '../../../../common/translations';
import { SHOW_METRICS, EDIT_CASE_NAME, NEW_CASE_NAME_LABEL } from '../../translations';

interface CaseSettingsPopoverProps {
  caseData: CaseUI;
  syncAlerts: boolean;
  onSyncAlertsChange: (enabled: boolean) => void;
  showMetrics: boolean;
  onShowMetricsChange: (enabled: boolean) => void;
  onCaseNameChange: (newName: string) => void;
  isOpen: boolean;
  onClose: () => void;
  anchorElement: HTMLElement;
}

export const CaseSettingsPopover: FC<CaseSettingsPopoverProps> = ({
  caseData,
  syncAlerts,
  onSyncAlertsChange,
  showMetrics,
  onShowMetricsChange,
  onCaseNameChange,
  isOpen,
  onClose,
  anchorElement,
}) => {
  const { owner } = useCasesContext();
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState(caseData.title);

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

  const { data: selectedTemplateData } = useGetTemplate(selectedTemplateId || undefined);
  const { mutate: changeTemplate } = useChangeAppliedTemplate();

  useEffect(() => {
    if (
      selectedTemplateId &&
      selectedTemplateData &&
      selectedTemplateData.templateId === selectedTemplateId
    ) {
      changeTemplate({
        caseData,
        newTemplate: {
          id: selectedTemplateData.templateId,
          version: selectedTemplateData.templateVersion,
          fields: selectedTemplateData.definition.fields,
        },
      });
    }
  }, [selectedTemplateId, selectedTemplateData, caseData, changeTemplate]);

  const onTemplateChange = useCallback((selected: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedTemplateId(selected[0]?.value ?? '');
  }, []);

  const openRenameModal = useCallback(() => {
    setNewCaseName(caseData.title);
    setIsRenameModalOpen(true);
    onClose();
  }, [caseData.title, onClose]);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalOpen(false);
  }, []);

  const onSubmitRename = useCallback(() => {
    const trimmed = newCaseName.trim();
    if (trimmed && trimmed !== caseData.title) {
      onCaseNameChange(trimmed);
    }
    setIsRenameModalOpen(false);
  }, [newCaseName, caseData.title, onCaseNameChange]);

  return (
    <>
      <EuiWrappingPopover
        button={anchorElement}
        isOpen={isOpen}
        closePopover={onClose}
        anchorPosition="downRight"
        panelPaddingSize="m"
        aria-label={i18n.CASE_SETTINGS}
        data-test-subj="case-settings-popover"
      >
        <EuiPopoverTitle>{i18n.CASE_SETTINGS}</EuiPopoverTitle>
        <EuiFormRow label={commonI18n.APPLY_TEMPLATE_MODAL_TEMPLATE_LABEL} fullWidth>
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={selectedOptions}
            onChange={onTemplateChange}
            isLoading={isLoadingTemplates}
            placeholder={commonI18n.APPLY_TEMPLATE_MODAL_TEMPLATE_PLACEHOLDER}
            data-test-subj="case-settings-template-select"
            compressed
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiSwitch
          label={i18n.SYNC_ALERTS}
          checked={syncAlerts}
          onChange={(e) => onSyncAlertsChange(e.target.checked)}
          compressed
          data-test-subj="case-settings-sync-alerts-switch"
        />
        <EuiSpacer size="m" />
        <EuiSwitch
          label={SHOW_METRICS}
          checked={showMetrics}
          onChange={(e) => onShowMetricsChange(e.target.checked)}
          compressed
          data-test-subj="case-settings-show-metrics-switch"
        />
        <EuiHorizontalRule margin="m" />
        <EuiLink onClick={openRenameModal} data-test-subj="case-settings-change-name">
          {EDIT_CASE_NAME}
        </EuiLink>
      </EuiWrappingPopover>
      {isRenameModalOpen && (
        <EuiModal onClose={closeRenameModal} data-test-subj="case-rename-modal">
          <EuiModalHeader>
            <EuiModalHeaderTitle>{EDIT_CASE_NAME}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow label={NEW_CASE_NAME_LABEL} fullWidth>
              <EuiFieldText
                fullWidth
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
                data-test-subj="case-rename-input"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeRenameModal}>{commonI18n.CANCEL}</EuiButtonEmpty>
            <EuiButton
              fill
              onClick={onSubmitRename}
              isDisabled={!newCaseName.trim() || newCaseName.trim() === caseData.title}
              data-test-subj="case-rename-submit"
            >
              {commonI18n.SAVE}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

CaseSettingsPopover.displayName = 'CaseSettingsPopover';
