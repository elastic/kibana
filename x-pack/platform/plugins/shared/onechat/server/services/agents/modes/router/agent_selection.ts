/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import type { RoundInput, AgentDefinition } from '@kbn/onechat-common';
import type { ScopedModel, ToolProvider } from '@kbn/onechat-server';
import { generateXmlTree, type XmlNode } from '@kbn/onechat-genai-utils/tools/utils/formatting';
import type { KibanaRequest } from '@kbn/core-http-server';
import { selectProviderTools } from '../utils';

export interface AgentSelectionResult {
  agentId: string;
  reason: string;
}

export const selectAgent = async ({
  input,
  model,
  selectableAgents,
  request,
  toolProvider,
}: {
  input: RoundInput;
  model: ScopedModel;
  selectableAgents: AgentDefinition[];
  toolProvider: ToolProvider;
  request: KibanaRequest;
}) => {
  const agentTools = await selectProviderTools({
    provider: toolProvider,
    selection: selectableAgents.flatMap((agent) => agent.configuration.tools),
    request,
  });

  const agentToNode = (agent: AgentDefinition): XmlNode => {
    return {
      tagName: 'agent',
      attributes: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        // tools TODO
      },
    };
  };

  const structuredModel = model.chatModel.withStructuredOutput(
    z
      .object({
        reasoning: z.string().describe('The reasoning behind your choice'),
        agent_id: z.string().describe('The id of the agent selected'),
      })
      .describe('Tool to use to select the agent'),
    { name: 'select_agent' }
  );

  const prompt: BaseMessageLike[] = [
    [
      'system',
      `You are specialized dispatcher AI agent, in charge of selecting the best agent for a conversation

      Based on the conversation and the agent definitions, You must select the agent you think is the most suited to answer this question

    `,
    ],
    [
      'user',
      `

    ## User message

    User message:
    """
    ${input.message}
    """

    ## Available agents

    ${generateXmlTree({
      tagName: 'agents',
      children: selectableAgents.map(agentToNode),
    })}
    `,
    ],
  ];

  const response = await structuredModel.invoke(prompt);
};
