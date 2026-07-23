/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Evaluator, TaskOutput } from '@kbn/evals';

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
  const messages = (output as { messages?: Array<{ message?: string }> })?.messages ?? [];
  return messages
    .filter((_, i) => i % 2 === 1)
    .map((m) => m?.message ?? '')
    .filter(Boolean);
};

const getAttachments = (output: TaskOutput): VersionedAttachment[] => {
  const attachments = (output as { attachments?: VersionedAttachment[] })?.attachments;
  return Array.isArray(attachments) ? attachments : [];
};

const getExpectRenderAttachment = (metadata: unknown): ExpectRenderAttachment | undefined => {
  const value = (metadata as { expectRenderAttachment?: unknown } | null)?.expectRenderAttachment;
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const getExpectAttachmentDataFn = (metadata: unknown): ExpectAttachmentDataFn | undefined => {
  const value = (metadata as { expectAttachmentData?: unknown } | null)?.expectAttachmentData;
  return typeof value === 'function' ? (value as ExpectAttachmentDataFn) : undefined;
};

export const createExpectedRenderAttachmentEvaluator = (): Evaluator => ({
  name: 'ExpectedRenderAttachment',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectation = getExpectRenderAttachment(metadata);

    if (expectation == null) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No render-attachment expectation for this example',
      };
    }

    if (expectation.length === 0) {
      throw new Error('expectRenderAttachment must contain at least one attachment type');
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
  evaluate: async ({ output, metadata }) => {
    const assertAttachmentData = getExpectAttachmentDataFn(metadata);

    if (!assertAttachmentData) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No attachment-data expectation for this example',
      };
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
