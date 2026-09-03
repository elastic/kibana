/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import type { Improvement } from '../common/http_api/improvements';
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

/**
 * The proposed change and where it came from, verbose enough to discuss.
 *
 * This goes in an attachment rather than the message body: pasted into the chat, a workflow
 * definition or a KI's content is unreadable and buries the question being asked.
 */
const buildImprovementBriefing = (improvement: Improvement): string => {
  const { action, title, rationale, target, payload, provenance, status, resolution } = improvement;

  const lines: Array<string | undefined> = [
    `Improvement: ${title}`,
    `Action: ${action}`,
    `Status: ${status}`,
    `Rationale: ${rationale}`,
    target?.ki_id ? `Target KI: ${target.ki_id}` : undefined,
    target?.workflow_id ? `Target workflow: ${target.workflow_id}` : undefined,
    target?.source_value ? `Target source: ${target.source_value}` : undefined,
    target?.subject ? `Subject: ${target.subject}` : undefined,
    payload.ki ? `Proposed KI:\n${JSON.stringify(payload.ki, null, 2)}` : undefined,
    payload.ki_patch
      ? `Proposed KI changes:\n${JSON.stringify(payload.ki_patch, null, 2)}`
      : undefined,
    payload.workflow_yaml ? `Proposed workflow:\n${payload.workflow_yaml}` : undefined,
    payload.source ? `Proposed source: ${payload.source.type} ${payload.source.value}` : undefined,
    provenance.signal_window
      ? `Derived from ${provenance.signal_count ?? 0} signal(s) between ${
          provenance.signal_window.from
        } and ${provenance.signal_window.to}`
      : 'Proposed by the assistant in a conversation, not derived from signals',
    provenance.tags?.length ? `Signal tags: ${provenance.tags.join(', ')}` : undefined,
    provenance.signal_ids?.length ? `Signal IDs:\n${provenance.signal_ids.join('\n')}` : undefined,
    resolution?.error ? `Previous apply error: ${resolution.error}` : undefined,
    resolution?.reason ? `Previously rejected because: ${resolution.reason}` : undefined,
  ];

  return lines.filter((line): line is string => Boolean(line)).join('\n');
};

/** Builds Agent Builder `openChat` options for an Analyze & improve hand-off. */
export const buildAnalyzeChat = ({
  aiIndex,
  improvement,
  conversationId,
}: AnalyzeAndImproveContext): AnalyzeChatOptions =>
  conversationId
    ? {
        agentId: aiIndex.feedback_analysis?.agent_id,
        conversationId,
        // Its own tag, so reopening a run does not overwrite which conversation the interactive
        // hand-off resumes.
        sessionTag: `context-engine-run:${aiIndex.id}`,
        attachments: [],
      }
    : buildInteractiveChat({ aiIndex, improvement });

const buildInteractiveChat = ({
  aiIndex,
  improvement,
}: AnalyzeAndImproveContext): AnalyzeChatOptions => ({
  agentId: aiIndex.feedback_analysis?.agent_id,
  // No `newConversation`: reopening resumes the thread this tag last used, so returning to a
  // half-finished discussion continues it. Each improvement gets a tag of its own — deciding on
  // one suggestion is a separate conversation from deciding on another, even about one index.
  sessionTag: improvement
    ? `context-engine-feedback:${aiIndex.id}:${improvement.improvement_id}`
    : `context-engine-feedback:${aiIndex.id}`,
  attachments: [
    {
      id: `context-engine-ai-index:${aiIndex.id}`,
      type: AttachmentType.text,
      data: { content: buildIndexSummary(aiIndex) },
    },
    ...(improvement
      ? [
          {
            id: `context-engine-improvement:${improvement.improvement_id}`,
            type: AttachmentType.text,
            data: { content: buildImprovementBriefing(improvement) },
          },
        ]
      : []),
  ],
  ...(improvement
    ? {
        initialMessage: i18n.translate('xpack.contextEngine.analyzeChat.improvementMessage', {
          defaultMessage:
            'Help me decide whether to apply this suggested improvement: "{title}". The proposed change and the signals behind it are attached.',
          values: { title: improvement.title },
        }),
      }
    : {}),
});
