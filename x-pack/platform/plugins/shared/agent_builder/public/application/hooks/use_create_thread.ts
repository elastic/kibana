/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { CreateThreadResponse } from '../../../common/http_api/conversations';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';
import { appPaths } from '../utils/app_paths';
import { useAgentModel } from './agents/use_agent_model';
import { useConnectorSelection } from './chat/use_connector_selection';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useAgentId } from './use_conversation';
import { useKibana } from './use_kibana';
import { useNavigation } from './use_navigation';

export interface CreateThreadVars {
  readonly highlightText?: string;
  readonly cutEventId?: string;
}

export const useCreateThread = () => {
  const parentId = useConversationId();
  const agentId = useAgentId();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const { selectedConnector } = useConnectorSelection();
  const { isLocked: isModelSetByAgent } = useAgentModel(agentId);
  const queryClient = useQueryClient();

  return useMutation<CreateThreadResponse, unknown, CreateThreadVars>({
    mutationKey: mutationKeys.createThread(parentId),
    mutationFn: ({ highlightText, cutEventId }) => {
      if (!parentId) {
        return Promise.reject(new Error('Cannot create a thread without a conversation id'));
      }
      const text = highlightText?.trim();
      // An explicit connector overrides the agent's own model server-side.
      const connectorId = isModelSetByAgent ? undefined : selectedConnector;
      const projectRouting = services.plugins.cps?.cpsManager?.getProjectRouting();
      return conversationsService.createThread({
        parentId,
        client_thread_id: uuidv4(),
        ...(text ? { highlight: { text } } : {}),
        ...(cutEventId ? { cut_event_id: cutEventId } : {}),
        ...(connectorId ? { connector_id: connectorId } : {}),
        ...(projectRouting ? { project_routing: projectRouting } : {}),
      });
    },
    onSuccess: ({ thread_id: threadId, conversation }) => {
      queryClient.setQueryData(queryKeys.conversations.byId(threadId), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(parentId) });
      }

      if (isEmbeddedContext) {
        setConversationId?.(threadId);
        return;
      }
      navigateToAgentBuilderUrl(
        appPaths.agent.conversations.byId({
          agentId: conversation.agent_id,
          conversationId: threadId,
        })
      );
    },
  });
};
