/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { Evaluator, TaskOutput } from '@kbn/evals';

export const RENDER_ATTACHMENT_TAG_RE =
  /<render_attachment\b(?=[^>]*\bid\s*=\s*["'][^"']+["'])(?=[^>]*\bversion\s*=\s*["'][^"']+["'])[^>]*\/?>/i;

export interface RenderAttachmentRef {
  id: string;
  version: number;
  tag: string;
}

export type AssertAttachmentFn = (attachment: RuleAttachmentData) => void | Promise<void>;

/**
 * Render-attachment expectation:
 * - `true`: at least one valid `<render_attachment>` tag must appear
 * - `string[]`: each listed attachment type must be rendered
 * - object: combine type checks with an optional structural assert on the
 *   resolved rule attachment (`assert`)
 */
export type ExpectRenderAttachment =
  | true
  | readonly string[]
  | {
      /** Attachment types that must be rendered. Defaults to `true` (any tag). */
      types?: true | readonly string[];
      /**
       * Jest-style structural assert against the composed rule attachment.
       * In-memory only — not serializable to Phoenix datasets.
       */
      assert?: AssertAttachmentFn;
    };

interface NormalizedExpectation {
  types: true | readonly string[];
  assert?: AssertAttachmentFn;
}

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

const getRuleAttachment = (output: TaskOutput): RuleAttachmentData | undefined => {
  const value = (output as { ruleAttachment?: RuleAttachmentData })?.ruleAttachment;
  return value && typeof value === 'object' ? value : undefined;
};

const normalizeExpectation = (value: unknown): NormalizedExpectation | undefined => {
  if (value === true) {
    return { types: true };
  }
  if (Array.isArray(value)) {
    return {
      types: value.filter((item): item is string => typeof item === 'string' && item.length > 0),
    };
  }
  if (value && typeof value === 'object') {
    const record = value as { types?: unknown; assert?: unknown };
    const types = record.types === undefined ? true : record.types;
    const assert = typeof record.assert === 'function' ? (record.assert as AssertAttachmentFn) : undefined;
    if (types !== true && !Array.isArray(types) && assert == null) {
      return undefined;
    }
    return {
      types: Array.isArray(types)
        ? types.filter((item): item is string => typeof item === 'string' && item.length > 0)
        : true,
      assert,
    };
  }
  return undefined;
};

export const createExpectedRenderAttachmentEvaluator = (): Evaluator => ({
  name: 'ExpectedRenderAttachment',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectation = normalizeExpectation(metadata?.expectRenderAttachment);

    if (expectation == null) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No render-attachment expectation for this example',
      };
    }

    if (Array.isArray(expectation.types) && expectation.types.length === 0) {
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

    const missingTypes =
      expectation.types === true
        ? []
        : expectation.types.filter((type) => !renderedTypes.includes(type));
    const renderPassed =
      matchedRefs.length > 0 && (expectation.types === true || missingTypes.length === 0);

    const scoreMetadata: Record<string, unknown> = {
      expectRenderAttachment: expectation.types,
      matchedTags: matchedRefs.map((ref) => ref.tag),
      renderedTypes,
      missingTypes,
      assistantMessageCount: assistantMessages.length,
      hasAssert: expectation.assert != null,
    };

    if (!renderPassed) {
      return {
        score: 0,
        metadata: scoreMetadata,
      };
    }

    if (!expectation.assert) {
      return {
        score: 1,
        metadata: scoreMetadata,
      };
    }

    const attachment = getRuleAttachment(output as TaskOutput);
    if (!attachment) {
      return {
        score: 0,
        explanation:
          'expectRenderAttachment.assert was provided but no rule attachment data was found on the conversation',
        metadata: {
          ...scoreMetadata,
          conversationId: (output as { conversationId?: string })?.conversationId ?? null,
          attachmentCount: attachments.length,
        },
      };
    }

    try {
      await expectation.assert(attachment);
      return {
        score: 1,
        metadata: {
          ...scoreMetadata,
          kind: attachment.kind,
          schedule: attachment.schedule,
          ruleId: attachment.id,
        },
      };
    } catch (error) {
      return {
        score: 0,
        explanation: error instanceof Error ? error.message : String(error),
        metadata: {
          ...scoreMetadata,
          kind: attachment.kind,
          schedule: attachment.schedule,
          ruleId: attachment.id,
        },
      };
    }
  },
});
