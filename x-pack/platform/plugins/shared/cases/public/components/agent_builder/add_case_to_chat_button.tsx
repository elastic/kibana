/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { PLATFORM_CASE_ATTACHMENT_TYPE } from '../../../common/constants/agent_builder';
import type { CaseUI } from '../../../common/ui/types';
import { useCasesDependencies } from '../../common/use_cases_dependencies';

const ADD_TO_CHAT = i18n.translate('xpack.cases.agentBuilder.addToChat', {
  defaultMessage: 'Add to Chat',
});

const CASE_ATTACHMENT_PROMPT = i18n.translate('xpack.cases.agentBuilder.caseAttachmentPrompt', {
  defaultMessage:
    'Help me investigate this case. Review linked alerts, observables, and comments. Summarize the current status and suggest next steps.',
});

export interface AddCaseToChatButtonProps {
  caseData: CaseUI;
}

export const AddCaseToChatButton: React.FC<AddCaseToChatButtonProps> = ({ caseData }) => {
  const { agentBuilder } = useCasesDependencies();

  const onClick = useCallback(() => {
    if (!agentBuilder?.openChat) {
      return;
    }

    const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

    const attachment: AttachmentInput = {
      id: `case-${caseData.id}`,
      type: PLATFORM_CASE_ATTACHMENT_TYPE,
      data: {
        case_id: caseData.id,
        owner,
        title: caseData.title,
        description: caseData.description,
        attachmentLabel: caseData.title,
      },
    };

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: CASE_ATTACHMENT_PROMPT,
      attachments: [attachment],
      caseId: caseData.id,
      sessionTag: `cases-${owner}`,
    });
  }, [agentBuilder, caseData]);

  if (!agentBuilder?.openChat) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="casesAddToChatButton"
      iconType="sparkles"
      onClick={onClick}
      flush="left"
    >
      {ADD_TO_CHAT}
    </EuiButtonEmpty>
  );
};
