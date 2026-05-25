/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CasesClient } from '../../client';

const AGENT_MENTION_PATTERN = /@agent\b/i;

export interface CaseAiTriggerInput {
  caseId: string;
  owner: string;
  commentText?: string;
  eventType?: 'comment_created' | 'alert_attached';
}

export interface CaseAiTriggerResult {
  shouldTrigger: boolean;
  reason: 'mention' | 'assignee_bot' | 'event' | 'none';
}

/**
 * Determines whether an Agent Builder run should be triggered for a case event.
 * Phase 3 default: @agent mention in comment text only.
 */
export const evaluateCaseAiTrigger = ({
  input,
  logger,
}: {
  input: CaseAiTriggerInput;
  logger: Logger;
}): CaseAiTriggerResult => {
  if (input.commentText && AGENT_MENTION_PATTERN.test(input.commentText)) {
    return { shouldTrigger: true, reason: 'mention' };
  }

  if (input.eventType === 'alert_attached') {
    logger.debug(`Case AI auto-trigger disabled for alert_attached on case ${input.caseId}`);
  }

  return { shouldTrigger: false, reason: 'none' };
};

export interface PostAiResponseToCaseParams {
  casesClient: CasesClient;
  caseId: string;
  owner: string;
  content: string;
  agentId?: string;
  skillId?: string;
  conversationId?: string;
  citations?: Array<{ label: string; url?: string; type?: string }>;
}

/**
 * Persists an AI-authored response on the case activity log as a unified attachment.
 */
export const postAiResponseToCase = async ({
  casesClient,
  caseId,
  owner,
  content,
  agentId,
  skillId,
  conversationId,
  citations,
}: PostAiResponseToCaseParams): Promise<{ commentId: string }> => {
  const updatedCase = await casesClient.attachments.add({
    caseId,
    comment: {
      type: 'cases.ai_response',
      owner,
      data: {
        content,
        ...(agentId ? { agent_id: agentId } : {}),
        ...(skillId ? { skill_id: skillId } : {}),
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(citations?.length ? { citations } : {}),
      },
    },
    mode: 'unified',
  });

  const aiComment = updatedCase.comments
    ?.filter((attachment) => attachment.type === 'cases.ai_response')
    .at(-1);

  const commentId = aiComment?.id;
  if (!commentId) {
    throw new Error('Failed to create AI response attachment on case');
  }

  return { commentId };
};
