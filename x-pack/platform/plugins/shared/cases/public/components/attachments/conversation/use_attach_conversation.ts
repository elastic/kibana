/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { useCasesToast } from '../../../common/use_cases_toast';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useRefreshCaseViewPage } from '../../case_view/use_on_refresh_case_view_page';
import type { FoundConversation } from './use_find_conversations';
import * as i18n from './translations';

export const useAttachConversation = ({
  caseId,
  caseOwner,
}: {
  caseId: string;
  caseOwner: string;
}) => {
  const { showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { mutateAsync: createAttachments, isLoading: isAttaching } = useCreateAttachments();
  const [attachingId, setAttachingId] = useState<string | null>(null);

  // Errors surface through the mutation's own toast; callers only need to know the call ended.
  const attach = useCallback(
    async (conversation: FoundConversation) => {
      setAttachingId(conversation.id);
      try {
        await createAttachments({
          caseId,
          caseOwner,
          attachments: [
            { type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE, attachmentId: conversation.id },
          ],
        });
        showSuccessToast(i18n.ATTACH_SUCCESS_TITLE(conversation.title));
        refreshCaseViewPage();
      } finally {
        setAttachingId(null);
      }
    },
    [caseId, caseOwner, createAttachments, refreshCaseViewPage, showSuccessToast]
  );

  return { attach, attachingId, isAttaching };
};
