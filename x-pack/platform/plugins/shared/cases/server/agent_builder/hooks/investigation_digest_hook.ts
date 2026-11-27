/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import type { ProcessedAttachment } from '@kbn/agent-builder-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import type { InvestigationsSetup } from '../../investigations';

/**
 * Gives the model a compact digest of the investigation linked to the conversation on each
 * round, so it can orient without a tool call. Detail is read through the paged tools.
 */
export const registerInvestigationDigestHook = (
  agentBuilder: AgentBuilderPluginSetup,
  investigations: InvestigationsSetup,
  logger: Logger
): void => {
  agentBuilder.hooks.register({
    id: 'cases-investigation-digest',
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        handler: async ({ nextInput, request, conversationId }) => {
          if (!conversationId || !nextInput.message) {
            return;
          }
          try {
            const service = await investigations.getServiceForRequest(request);
            const recordId = await service.findRecordIdByConversation(conversationId);
            if (!recordId) {
              return;
            }
            const digest = await service.buildDigest(recordId);
            // Sent as a round-input attachment rather than appended to the message: the stored
            // round keeps only the message, so the digest reaches the model but never the chat UI
            // or the conversation history.
            const attachment: ProcessedAttachment = {
              attachment: {
                id: `investigation-digest-${recordId}`,
                type: 'text',
                data: { content: digest },
                hidden: true,
              },
              representation: { type: 'text', value: digest },
              tools: [],
            };
            return {
              nextInput: { ...nextInput, attachments: [...nextInput.attachments, attachment] },
            };
          } catch (error) {
            // The digest is an optimisation: the agent can still read the record through its tools.
            logger.warn(`Investigation digest was not added to the round input: ${error}`);
          }
        },
      },
    },
  });
};
