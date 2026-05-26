/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import type { CaseUI } from '../../../common/ui/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { useCasesDependencies } from '../../common/use_cases_dependencies';

const OPEN_AI_WORKSPACE = i18n.translate('xpack.cases.agentBuilder.openAiWorkspace', {
  defaultMessage: 'AI Workspace',
});

export interface AddCaseToChatButtonProps {
  caseData: CaseUI;
}

export const AddCaseToChatButton: React.FC<AddCaseToChatButtonProps> = ({ caseData }) => {
  const { agentBuilder } = useCasesDependencies();
  const { navigateToCaseView } = useCaseViewNavigation();

  const onClick = useCallback(() => {
    if (agentBuilder?.CaseAiWorkspace) {
      navigateToCaseView({
        detailName: caseData.id,
        tabId: CASE_VIEW_PAGE_TABS.AI_WORKSPACE,
      });
      return;
    }

    if (!agentBuilder?.openChat) {
      return;
    }

    const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      caseId: caseData.id,
      caseOwner: owner,
      caseTitle: caseData.title,
      sessionTag: `cases-${owner}`,
    });
  }, [agentBuilder, caseData, navigateToCaseView]);

  if (!agentBuilder?.CaseAiWorkspace && !agentBuilder?.openChat) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="casesOpenAiWorkspaceButton"
      iconType="sparkles"
      onClick={onClick}
      flush="left"
    >
      {OPEN_AI_WORKSPACE}
    </EuiButtonEmpty>
  );
};
