/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';

export const RENDER_ATTACHMENT_TAG_RE =
  /<render_attachment\b(?=[^>]*\bid\s*=\s*["'][^"']+["'])(?=[^>]*\bversion\s*=\s*["'][^"']+["'])[^>]*\/?>/i;

export interface RenderAttachmentRef {
  id: string;
  version: number;
  tag: string;
}

export const parseRenderAttachmentRef = (message: string): RenderAttachmentRef | null => {
  const tagMatch = message.match(RENDER_ATTACHMENT_TAG_RE)?.[0];
  if (!tagMatch) {
    return null;
  }
  const id = tagMatch.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
  const versionRaw = tagMatch.match(/\bversion\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!id || versionRaw === undefined) {
    return null;
  }
  const version = Number(versionRaw);
  if (!Number.isFinite(version)) {
    return null;
  }
  return { id, version, tag: tagMatch };
};

const getBooleanMeta = (metadata: unknown, key: string): boolean => {
  const value = (metadata as Record<string, unknown> | null)?.[key];
  return value === true;
};

export const getAssistantMessages = (output: TaskOutput): string[] => {
  const messages = (output as { messages?: Array<{ message?: string }> })?.messages ?? [];
  return messages
    .filter((_, i) => i % 2 === 1)
    .map((m) => m?.message ?? '')
    .filter(Boolean);
};

export const createExpectedRenderAttachmentEvaluator = (): Evaluator => ({
  name: 'ExpectedRenderAttachment',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    if (!getBooleanMeta(metadata, 'expectRenderAttachment')) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No render-attachment expectation for this example',
      };
    }

    const assistantMessages = getAssistantMessages(output as TaskOutput);
    const matchedRef = assistantMessages
      .map((message) => parseRenderAttachmentRef(message))
      .find((ref): ref is RenderAttachmentRef => ref != null);

    return {
      score: matchedRef ? 1 : 0,
      metadata: {
        expectRenderAttachment: true,
        matchedTag: matchedRef?.tag ?? null,
        attachmentId: matchedRef?.id ?? null,
        attachmentVersion: matchedRef?.version ?? null,
        assistantMessageCount: assistantMessages.length,
      },
    };
  },
});
