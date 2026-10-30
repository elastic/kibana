/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import type { AnalyzeAndImproveContext, AnalyzeChatOptions } from './types';

const workflowIdsOf = (aiIndex: AiIndexHttpItem): string[] =>
  aiIndex.automations
    .filter((automation) => automation.type === 'workflow')
    .map((automation) => automation.value);

const buildIndexSummary = (aiIndex: AiIndexHttpItem): string => {
  const workflowIds = workflowIdsOf(aiIndex);
  const lines: Array<string | undefined> = [
    `AI index: ${aiIndex.id}${aiIndex.managed ? ' (managed)' : ''}`,
    aiIndex.description ? `Description: ${aiIndex.description}` : undefined,
    `Dest: ${aiIndex.dest.type} ${aiIndex.dest.value}`,
    aiIndex.sources.length
      ? `Sources:\n${aiIndex.sources
          .map((source) => `- ${source.type}: ${source.value}`)
          .join('\n')}`
      : 'Sources: none',
    workflowIds.length
      ? `Linked workflow IDs:\n${workflowIds.map((id) => `- ${id}`).join('\n')}`
      : 'Linked workflow IDs: none',
  ];
  return lines.filter((line): line is string => Boolean(line)).join('\n');
};

/** Builds Agent Builder `openChat` options for an Analyze & improve hand-off. */
export const buildAnalyzeChat = ({ aiIndex }: AnalyzeAndImproveContext): AnalyzeChatOptions => ({
  agentId: aiIndex.feedback_analysis?.agent_id,
  newConversation: true,
  sessionTag: `context-engine-feedback:${aiIndex.id}`,
  attachments: [
    {
      id: `context-engine-ai-index:${aiIndex.id}`,
      type: AttachmentType.text,
      data: { content: buildIndexSummary(aiIndex) },
    },
  ],
});
