/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentAnswerStepConfiguration,
  AgentResearchStepConfiguration,
} from '@kbn/onechat-common';
import type { AgentKnowledge } from '@kbn/onechat-server/agents';

export type ResolvedAnswerStepConfiguration = Required<AgentAnswerStepConfiguration>;
export type ResolvedResearchStepConfiguration = Required<AgentResearchStepConfiguration>;

export interface ResolvedConfiguration {
  research: ResolvedResearchStepConfiguration;
  answer: ResolvedAnswerStepConfiguration;
  knowledge: ResolvedAgentKnowledge[];
}

export type ResolvedAgentKnowledge = Omit<AgentKnowledge, 'configuration'> & {
  configuration: ResolvedAgentKnowledgeConfiguration;
};

export interface ResolvedAgentKnowledgeConfiguration {
  researchInstructions?: string;
  answerInstructions?: string;
  context?: string;
}
