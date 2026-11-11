/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ObservableWithMetadata } from '../../common/types/api';
import type { CaseUI } from '../../common/ui/types';
import {
  OBSERVABLE_ATTACHMENT_TYPE,
  type ObservableAttachmentData,
} from '../../common/types/agent_builder/attachment_schemas';
import { useCasesConfig, useKibana } from '../common/lib/kibana';
import { getAppIdForOwner, getCasePathForOwner } from './attachments/route_helpers';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';
import { OBSERVABLE_ATTACHMENT_PROMPT } from './translations';

export interface ObservableChatContext {
  observable: ObservableWithMetadata;
  caseData: Pick<CaseUI, 'id' | 'title' | 'owner'>;
  typeLabel?: string;
}

export const getObservableAttachment = (
  { observable, caseData, typeLabel }: ObservableChatContext,
  application: ApplicationStart
): AttachmentInput<typeof OBSERVABLE_ATTACHMENT_TYPE, ObservableAttachmentData> => ({
  // One attachment per observable, so adding it again replaces it.
  id: `${OBSERVABLE_ATTACHMENT_TYPE}:${caseData.id}:${observable.id}`,
  type: OBSERVABLE_ATTACHMENT_TYPE,
  data: {
    id: observable.id,
    type_key: observable.typeKey,
    ...(typeLabel != null && { type_label: typeLabel }),
    value: observable.value,
    description: observable.description,
    ...(observable.metadata != null && { metadata: observable.metadata }),
    case_id: caseData.id,
    case_title: caseData.title,
    owner: caseData.owner,
    url: application.getUrlForApp(getAppIdForOwner(caseData.owner), {
      path: getCasePathForOwner(caseData.owner, caseData.id),
    }),
  },
});

/**
 * Adds an observable to a new Agent Builder conversation with a starter prompt, like the alert
 * flyout's "Add to chat". Available when chat is enabled and the user can use Agent Builder.
 */
export const useAddObservableToChat = (context: ObservableChatContext) => {
  const {
    services: { agentBuilder, application },
  } = useKibana();
  const { chatEnabled } = useCasesConfig();
  const { isAgentBuilderAvailable } = useAgentBuilderAvailability();

  const isAddToChatAvailable =
    chatEnabled && isAgentBuilderAvailable && Boolean(agentBuilder?.openChat);

  const addToChat = useCallback(() => {
    if (!isAddToChatAvailable || !agentBuilder?.openChat) {
      return;
    }

    agentBuilder.openChat({
      // Like the alert flyout: the prompt waits in the message box for the user to send or edit.
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: OBSERVABLE_ATTACHMENT_PROMPT,
      attachments: [getObservableAttachment(context, application)],
    });
  }, [agentBuilder, application, context, isAddToChatAvailable]);

  return useMemo(() => ({ addToChat, isAddToChatAvailable }), [addToChat, isAddToChatAvailable]);
};
