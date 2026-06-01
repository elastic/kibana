/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type {
  FormPromptRequest,
  FormPromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import type { ChatRequestBodyPayload } from '../../../../../../common/http_api/chat';
import type {
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
} from '../../../../../types';
import type { InternalStartServices } from '../../../..';
import { handleFormPromptResponse } from '../handle_form_prompt';

export interface ResumedFormPromptState {
  execution_id: string;
  /** FormPromptRequest for the NEXT waitForInput step, if the workflow advanced to one. */
  nextFormPrompt?: FormPromptRequest;
  observedExecution: WorkflowExecutionState | null;
  observedStatus: string;
}

export const resumeFormPrompts = async ({
  coreSetup,
  getInternalServices,
  logger,
  payload,
  pluginsSetup,
  request,
  spaceId,
}: {
  coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>;
  getInternalServices: () => InternalStartServices;
  logger?: Logger;
  payload: ChatRequestBodyPayload;
  pluginsSetup: AgentBuilderSetupDependencies;
  request: KibanaRequest;
  spaceId: string;
}): Promise<ResumedFormPromptState[]> => {
  const { conversation_id: conversationId, form_prompts: formPrompts } = payload;
  if (!formPrompts?.length) return [];

  const workflowApi = pluginsSetup.workflowsManagement?.management;
  if (!workflowApi) return [];

  const { conversations } = getInternalServices();
  const conversationClient = conversationId
    ? await conversations.getScopedClient({ request })
    : undefined;

  logger?.debug(
    () =>
      `[hitl-debug][ab] resumeForms.start count=${formPrompts.length} execs=${formPrompts
        .map((f) => f.execution_id)
        .join(',')}`
  );

  return Promise.all(
    formPrompts.map(
      async (formPromptResponse: FormPromptResponse): Promise<ResumedFormPromptState> => {
        const { execution_id } = formPromptResponse;

        const outcome = await handleFormPromptResponse({
          analytics: coreSetup.analytics,
          conversationClient,
          conversationId,
          formPromptResponse,
          logger,
          request,
          spaceId,
          workflowApi,
        });

        logger?.debug(
          () =>
            `[hitl-debug][ab] resumeForms.outcome exec=${execution_id} seq=(none) stepId=(none) kind=${
              outcome.kind
            } nextFormPrompt=${outcome.nextFormPrompt !== undefined ? 'yes' : 'no'} reason=${
              outcome.kind === 'stale' ? outcome.reason : 'n/a'
            }`
        );

        if (outcome.kind === 'stale') {
          return {
            execution_id,
            ...(outcome.nextFormPrompt !== undefined
              ? { nextFormPrompt: outcome.nextFormPrompt }
              : {}),
            observedExecution: outcome.observedExecution,
            observedStatus: outcome.observedStatus,
          };
        }

        return {
          execution_id,
          ...(outcome.nextFormPrompt !== undefined
            ? { nextFormPrompt: outcome.nextFormPrompt }
            : {}),
          observedExecution: outcome.observedExecution,
          observedStatus: outcome.observedStatus,
        };
      }
    )
  );
};
