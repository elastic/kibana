/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Evaluator, TaskOutput } from '@kbn/evals';
import { skippedResult } from '../evaluator_utils';

export const RENDER_ATTACHMENT_TAG_RE =
  /<render_attachment\b(?=[^>]*\bid\s*=\s*["'][^"']+["'])(?=[^>]*\bversion\s*=\s*["'][^"']+["'])[^>]*\/?>/i;

export interface RenderAttachmentRef {
  id: string;
  version: number;
  tag: string;
}

/** Attachment types that must each be rendered via a `<render_attachment>` tag. */
export type ExpectRenderAttachment = readonly string[];

export type ExpectAttachmentDataFn = (
  attachments: VersionedAttachment[]
) => void | Promise<void>;

/**
 * Latest current-version data among attachments of the given type
 * (filters by type, then takes the last match).
 */
export const getLatestAttachmentData = <T>(
  attachments: VersionedAttachment[],
  type: string
): T | undefined => {
  const ofType = attachments.filter((attachment) => attachment.type === type);
  const latest = ofType[ofType.length - 1];
  if (!latest) {
    return undefined;
  }
  return getLatestVersion<T>(latest as VersionedAttachment<string, T>)?.data;
};

export const parseRenderAttachmentRef = (message: string): RenderAttachmentRef | null => {
  return parseAllRenderAttachmentRefs(message)[0] ?? null;
};

export const parseAllRenderAttachmentRefs = (message: string): RenderAttachmentRef[] => {
  const refs: RenderAttachmentRef[] = [];
  const globalRe = new RegExp(RENDER_ATTACHMENT_TAG_RE.source, 'gi');
  for (const match of message.matchAll(globalRe)) {
    const tag = match[0];
    const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    const versionRaw = tag.match(/\bversion\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!id || versionRaw === undefined) {
      continue;
    }
    const version = Number(versionRaw);
    if (!Number.isFinite(version)) {
      continue;
    }
    refs.push({ id, version, tag });
  }
  return refs;
};

export const getAssistantMessages = (output: TaskOutput): string[] => {
  const rounds = (output as { rounds?: ConversationRound[] })?.rounds;
  if (Array.isArray(rounds) && rounds.length > 0) {
    return rounds.map((round) => round.response?.message ?? '').filter(Boolean);
  }

  // Fallback for unit fixtures that only provide a messages projection.
  const messages =
    (output as { messages?: Array<{ role?: string; message?: string }> })?.messages ?? [];
  return messages
    .filter((m) => m?.role === 'assistant')
    .map((m) => m?.message ?? '')
    .filter(Boolean);
};

const getAttachments = (output: TaskOutput): VersionedAttachment[] => {
  const attachments = (output as { attachments?: VersionedAttachment[] })?.attachments;
  return Array.isArray(attachments) ? attachments : [];
};

/** `null` means the field was omitted (skip); never returns `undefined`. */
const getExpectRenderAttachment = (expected: unknown): ExpectRenderAttachment | null => {
  const value = (expected as { expectRenderAttachment?: unknown } | null)?.expectRenderAttachment;
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new Error('expectRenderAttachment must be a non-empty array of attachment types');
  }
  const types = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (types.length === 0) {
    throw new Error('expectRenderAttachment must contain at least one attachment type');
  }
  return types;
};

/** `null` means the field was omitted (skip); never returns `undefined`. */
const getExpectAttachmentDataFn = (expected: unknown): ExpectAttachmentDataFn | null => {
  const value = (expected as { expectAttachmentData?: unknown } | null)?.expectAttachmentData;
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'function') {
    throw new Error('expectAttachmentData must be a function');
  }
  return value as ExpectAttachmentDataFn;
};

export const createExpectedRenderAttachmentEvaluator = (): Evaluator => ({
  name: 'ExpectedRenderAttachment',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const expectation = getExpectRenderAttachment(expected);

    if (expectation === null) {
      return skippedResult('No render-attachment expectation for this example');
    }

    const assistantMessages = getAssistantMessages(output as TaskOutput);
    const matchedRefs = assistantMessages.flatMap((message) => parseAllRenderAttachmentRefs(message));
    const attachments = getAttachments(output as TaskOutput);
    const renderedTypes = [
      ...new Set(
        matchedRefs
          .map((ref) => attachments.find((attachment) => attachment.id === ref.id)?.type)
          .filter((type): type is string => typeof type === 'string' && type.length > 0)
      ),
    ];
    const missingTypes = expectation.filter((type) => !renderedTypes.includes(type));

    return {
      score: matchedRefs.length > 0 && missingTypes.length === 0 ? 1 : 0,
      metadata: {
        expectRenderAttachment: expectation,
        matchedTags: matchedRefs.map((ref) => ref.tag),
        renderedTypes,
        missingTypes,
        assistantMessageCount: assistantMessages.length,
      },
    };
  },
});

export const createExpectedAttachmentDataEvaluator = (): Evaluator => ({
  name: 'ExpectedAttachmentData',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const assertAttachmentData = getExpectAttachmentDataFn(expected);

    if (assertAttachmentData === null) {
      return skippedResult('No attachment-data expectation for this example');
    }

    const attachments = getAttachments(output as TaskOutput);

    try {
      await assertAttachmentData(attachments);
      return {
        score: 1,
        metadata: {
          attachmentCount: attachments.length,
          attachmentTypes: attachments.map((attachment) => attachment.type),
        },
      };
    } catch (error) {
      return {
        score: 0,
        explanation: error instanceof Error ? error.message : String(error),
        metadata: {
          attachmentCount: attachments.length,
          attachmentTypes: attachments.map((attachment) => attachment.type),
        },
      };
    }
  },
});
