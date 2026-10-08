/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { CaseSeverity, CaseUI } from '../../../../../common';
import { CaseAccessMode } from '../../../../../common/types/domain';
import type { OnUpdateFields } from '../../types';
import { PAGE_TITLE, CANCEL } from '../../../../common/translations';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../../common/use_cases_features';
import { useAccessControlClickedEBT } from '../../../../analytics/use_access_control_ebt';
import { ConfirmDeleteCaseModal } from '../../../confirm_delete_case';
import { CasesAppHeader } from '../../../app/cases_app_header';
import * as i18n from '../../translations';
import { CaseSettingsPopover } from './case_settings_popover';
import { useCaseViewHeader } from './hooks/use_case_view_header';
import { useCloseCaseFlow } from './hooks/use_close_case_flow';

interface CaseDetailsAppHeaderProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  showMetrics: boolean;
  onShowMetricsChange: (enabled: boolean) => void;
}

export const CaseDetailsAppHeader: FC<CaseDetailsAppHeaderProps> = ({
  caseData,
  onUpdateField,
  showMetrics,
  onShowMetricsChange,
}) => {
  const { permissions } = useCasesContext();
  const { hasCaseSettings } = useCasesFeatures();
  const { onStatusChanged, closeCaseModal } = useCloseCaseFlow({ caseData, onUpdateField });

  const onSeverityChanged = useCallback(
    (severity: CaseSeverity) => onUpdateField({ key: 'severity', value: severity }),
    [onUpdateField]
  );

  const [isRestrictModalVisible, setIsRestrictModalVisible] = useState(false);
  const restrictModalTitleId = useGeneratedHtmlId();
  const reportAccessControlClicked = useAccessControlClickedEBT('case_view');

  const onAccessChanged = useCallback(
    (mode: CaseAccessMode) => {
      reportAccessControlClicked(mode);

      if (mode === caseData.access?.mode || (mode === CaseAccessMode.DEFAULT && !caseData.access)) {
        return;
      }

      if (mode === CaseAccessMode.RESTRICTED) {
        // restricting narrows who can see the case and auto-assigns the actor —
        // confirm before applying
        setIsRestrictModalVisible(true);
        return;
      }

      onUpdateField({ key: 'access', value: { mode } });
    },
    [caseData.access, onUpdateField, reportAccessControlClicked]
  );

  const onConfirmRestrict = useCallback(() => {
    setIsRestrictModalVisible(false);
    onUpdateField({ key: 'access', value: { mode: CaseAccessMode.RESTRICTED } });
  }, [onUpdateField]);

  const {
    headerTitle,
    metadata,
    backHref,
    badges,
    menu,
    runWorkflowModal,
    isDeleteModalVisible,
    setIsDeleteModalVisible,
    onConfirmDeletion,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsAnchor,
  } = useCaseViewHeader({
    caseData,
    onStatusChanged,
    onSeverityChanged,
    onAccessChanged,
    onUpdateField,
  });

  const onSyncAlertsChanged = useCallback(
    (checked: boolean) =>
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, syncAlerts: checked },
      }),
    [caseData.settings, onUpdateField]
  );

  const onExtractObservablesChanged = useCallback(
    (checked: boolean) =>
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, extractObservables: checked },
      }),
    [caseData.settings, onUpdateField]
  );

  return (
    <>
      <CasesAppHeader
        title={headerTitle}
        back={{ href: backHref, label: PAGE_TITLE }}
        badges={badges}
        menu={menu}
        metadata={metadata}
      />
      {closeCaseModal}
      {runWorkflowModal}
      {isRestrictModalVisible && (
        <EuiConfirmModal
          title={i18n.RESTRICT_CASE_MODAL_TITLE}
          aria-labelledby={restrictModalTitleId}
          titleProps={{ id: restrictModalTitleId }}
          onCancel={() => setIsRestrictModalVisible(false)}
          onConfirm={onConfirmRestrict}
          cancelButtonText={CANCEL}
          confirmButtonText={i18n.RESTRICT_CASE_MODAL_CONFIRM}
          defaultFocusedButton="confirm"
          data-test-subj="case-restrict-confirm-modal"
        >
          {i18n.RESTRICT_CASE_MODAL_BODY}
        </EuiConfirmModal>
      )}
      {isDeleteModalVisible && (
        <ConfirmDeleteCaseModal
          totalCasesToBeDeleted={1}
          onCancel={() => setIsDeleteModalVisible(false)}
          onConfirm={onConfirmDeletion}
        />
      )}
      {settingsAnchor && permissions.update && hasCaseSettings && (
        <CaseSettingsPopover
          syncAlerts={caseData.settings.syncAlerts}
          onSyncAlertsChange={onSyncAlertsChanged}
          extractObservables={caseData.settings.extractObservables ?? false}
          onExtractObservablesChange={onExtractObservablesChanged}
          showMetrics={showMetrics}
          onShowMetricsChange={onShowMetricsChange}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          anchorElement={settingsAnchor}
        />
      )}
    </>
  );
};

CaseDetailsAppHeader.displayName = 'CaseDetailsAppHeader';
