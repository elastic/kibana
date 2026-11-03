/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
  SecurityServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { isSharedConversation } from '@kbn/agent-builder-common';
import type { DecisionsStart } from '@kbn/agent-builder-server';
import type { ConversationExecutionParams } from '@kbn/agent-builder-server/execution';
import type { AgentBuilderConfig } from '../../../config';
import type { AgentsServiceStart } from '../../agents';
import type { ConversationService } from '../../conversation';
import { sourceEvents } from '../../conversation/client/source_events';
import {
  buildTriggerDecisionInput,
  SHOULD_RESPOND_QUESTION,
  shouldRespondQuestions,
} from './build_trigger_decision_input';

export interface ShouldRunAgentDeps {
  logger: Logger;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
  conversationService: Pick<ConversationService, 'getScopedClient'>;
  agentService: AgentsServiceStart;
  decisions: DecisionsStart;
  decisionConfig: Pick<AgentBuilderConfig['decisionModel'], 'triggerThreshold' | 'timeoutMs'>;
}

/**
 * Builds the decision input for a request in a shared conversation, or returns `undefined` when
 * `trigger_mode: 'auto'` does not apply: the experimental flag is off, the conversation is new or
 * private, or something needed to decide could not be read.
 */
const getDecisionInput = async ({
  request,
  params: { conversationId, nextInput },
  deps: { logger, uiSettings, savedObjects, security, conversationService, agentService },
}: {
  request: KibanaRequest;
  params: Pick<ConversationExecutionParams, 'conversationId' | 'nextInput'>;
  deps: ShouldRunAgentDeps;
}): Promise<string | undefined> => {
  if (!conversationId) {
    return undefined;
  }

  try {
    const isExperimental = await uiSettings
      .asScopedToClient(savedObjects.getScopedClient(request))
      .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);

    if (!isExperimental) {
      return undefined;
    }

    const conversationClient = await conversationService.getScopedClient({ request });
    const conversation = await conversationClient.get(conversationId);

    if (!isSharedConversation(conversation.access_control)) {
      return undefined;
    }

    const agentRegistry = await agentService.getRegistry({ request });
    const agent = await agentRegistry.get(conversation.agent_id, { access: 'use' });
    const user = security.authc.getCurrentUser(request);

    return buildTriggerDecisionInput({
      events: sourceEvents(conversation),
      agent: { name: agent.name, description: agent.description },
      message: {
        text: nextInput.message,
        hasAttachments: Boolean(nextInput.attachments?.length),
        authorName: user?.full_name || user?.username,
      },
    });
  } catch (error) {
    logger.debug(`Running the agent without a decision: ${error.message}`);
    return undefined;
  }
};

/**
 * Whether `trigger_mode: 'auto'` runs the agent. Only shared conversations ask the decision model;
 * everything else, and any failure to decide, runs the agent.
 */
export const shouldRunAgent = async ({
  request,
  params,
  deps,
}: {
  request: KibanaRequest;
  params: Pick<ConversationExecutionParams, 'conversationId' | 'nextInput'>;
  deps: ShouldRunAgentDeps;
}): Promise<boolean> => {
  const input = await getDecisionInput({ request, params, deps });

  if (input === undefined) {
    return true;
  }

  const { decisions, decisionConfig } = deps;

  const result = await decisions.decide({
    request,
    input,
    questions: shouldRespondQuestions,
    timeoutMs: decisionConfig.timeoutMs,
  });

  if (result.status !== 'decided') {
    return true;
  }

  const answer = result.answers[SHOULD_RESPOND_QUESTION];

  if (answer?.type !== 'predicate') {
    return true;
  }

  return answer.probability >= decisionConfig.triggerThreshold;
};
