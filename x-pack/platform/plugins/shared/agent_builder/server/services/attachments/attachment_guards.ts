/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';
import { isToolCallStep, attachmentTools } from '@kbn/agent-builder-common';

export function isAttachmentReferencedInRounds(
  attachmentId: string,
  rounds: ConversationRound[]
): boolean {
  const attachmentToolIds = [attachmentTools.read, attachmentTools.update, attachmentTools.diff];
  for (const round of rounds) {
    for (const step of round.steps) {
      if (isToolCallStep(step)) {
        const toolCallStep = step as ToolCallStep;
        if (attachmentToolIds.includes(toolCallStep.tool_id)) {
          const params = toolCallStep.params as Record<string, unknown>;
          if (params.attachment_id === attachmentId) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function hasClientId(attachment: {
  client_id?: string;
  versions: Array<{ data: unknown }>;
}): boolean {
  if (attachment.client_id) return true;
  return attachment.versions.some((version) => {
    if (!version?.data || typeof version.data !== 'object') return false;
    return Boolean((version.data as { client_id?: string }).client_id);
  });
}
