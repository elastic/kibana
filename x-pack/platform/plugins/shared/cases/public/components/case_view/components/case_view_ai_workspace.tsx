/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import { useCasesDependencies } from '../../../common/use_cases_dependencies';
import { CaseViewTabs } from '../case_view_tabs';

export interface CaseViewAiWorkspaceProps {
  caseData: CaseUI;
}

export const CaseViewAiWorkspace: React.FC<CaseViewAiWorkspaceProps> = ({ caseData }) => {
  const { agentBuilder } = useCasesDependencies();

  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

  const fileCount = useMemo(
    () => caseData.comments?.filter((comment) => comment.type === FILE_ATTACHMENT_TYPE).length ?? 0,
    [caseData.comments]
  );

  const CaseAiWorkspace = agentBuilder?.CaseAiWorkspace;

  if (!CaseAiWorkspace) {
    return null;
  }

  return (
    <EuiFlexItem data-test-subj="case-view-ai-workspace-tab">
      <CaseViewTabs
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.AI_WORKSPACE}
      />
      <EuiSpacer size="l" />
      <CaseAiWorkspace
        caseId={caseData.id}
        caseTitle={caseData.title}
        caseOwner={owner}
        caseDescription={caseData.description}
        totalAlerts={caseData.totalAlerts}
        totalComments={caseData.totalComment}
        fileCount={fileCount}
      />
    </EuiFlexItem>
  );
};
