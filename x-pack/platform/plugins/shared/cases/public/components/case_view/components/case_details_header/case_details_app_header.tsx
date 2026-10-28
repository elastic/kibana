/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import type { CaseSeverity, CaseUI } from '../../../../../common';
import type { OnUpdateFields } from '../../types';
import { PAGE_TITLE } from '../../../../common/translations';
import { ConfirmDeleteCaseModal } from '../../../confirm_delete_case';
import { CasesAppHeader } from '../../../app/cases_app_header';
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
  const { onStatusChanged, closeCaseModal } = useCloseCaseFlow({ caseData, onUpdateField });

  const onSeverityChanged = useCallback(
    (severity: CaseSeverity) => onUpdateField({ key: 'severity', value: severity }),
    [onUpdateField]
  );

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
  } = useCaseViewHeader({
    caseData,
    onStatusChanged,
    onSeverityChanged,
    onUpdateField,
    showMetrics,
    onShowMetricsChange,
  });

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
      {isDeleteModalVisible && (
        <ConfirmDeleteCaseModal
          totalCasesToBeDeleted={1}
          onCancel={() => setIsDeleteModalVisible(false)}
          onConfirm={onConfirmDeletion}
        />
      )}
    </>
  );
};

CaseDetailsAppHeader.displayName = 'CaseDetailsAppHeader';
