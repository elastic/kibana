/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentConfiguration } from '@kbn/onechat-common';
import type {
  AgentKnowledge,
  KnowledgeConfiguration,
  AgentKnowledgeResolverContext,
  AgentHandlerContext,
} from '@kbn/onechat-server/agents';
import type {
  ResolvedConfiguration,
  ResolvedAgentKnowledge,
  ResolvedAgentKnowledgeConfiguration,
} from '../types';

export const resolveConfiguration = async ({
  configuration,
  context,
}: {
  configuration: AgentConfiguration;
  context: AgentHandlerContext;
}): Promise<ResolvedConfiguration> => {
  let researchInstructions = configuration.research?.instructions ?? '';
  let answerInstructions = configuration.answer?.instructions ?? '';
  if (configuration.instructions) {
    researchInstructions = researchInstructions
      ? `${researchInstructions}\n${configuration.instructions}`
      : configuration.instructions;
    answerInstructions = answerInstructions
      ? `${answerInstructions}\n${configuration.instructions}`
      : configuration.instructions;
  }

  return {
    research: {
      instructions: researchInstructions,
    },
    answer: {
      instructions: answerInstructions,
    },
    knowledge: configuration.skills
      ? (
          await Promise.all(
            configuration.skills.map(async (knowledgeId) => {
              const knowledge = context.agentService.knowledge.get(knowledgeId);
              return knowledge
                ? [await resolveAgentKnowledge({ knowledge, request: context.request })]
                : [];
            })
          )
        ).flat()
      : [],
  };
};

export const resolveAgentKnowledge = async ({
  knowledge,
  request,
}: {
  knowledge: AgentKnowledge;
  request: KibanaRequest;
}): Promise<ResolvedAgentKnowledge> => {
  const { configuration: configOrAccessor, ...knowledgeProps } = knowledge;

  let configuration: KnowledgeConfiguration;
  if (typeof configOrAccessor === 'function') {
    const context: AgentKnowledgeResolverContext = {
      request,
    };
    configuration = await configOrAccessor(context);
  } else {
    configuration = configOrAccessor;
  }

  const resolvedConf: ResolvedAgentKnowledgeConfiguration = {
    answerInstructions:
      typeof configuration.instructions === 'string'
        ? configuration.instructions
        : configuration.instructions?.answer,
    researchInstructions:
      typeof configuration.instructions === 'string'
        ? configuration.instructions
        : configuration.instructions?.research,
    context: configuration.context,
  };

  return {
    ...knowledgeProps,
    configuration: resolvedConf,
  };
};
