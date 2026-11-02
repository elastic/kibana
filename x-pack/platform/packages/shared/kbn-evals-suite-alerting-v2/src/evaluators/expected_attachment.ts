/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Evaluator, TaskOutput } from '@kbn/evals';
import { getAssistantMessages, requireNonEmptyStringList, skippedResult } from '../evaluator_utils';
import type { AttachmentDataChecks, ExpectAttachmentDataFn, RuleManagementExample } from '../types';

export const RENDER_ATTACHMENT_TAG_RE =
  /<render_attachment\b(?=[^>]*\bid\s*=\s*["'][^"']+["'])(?=[^>]*\bversion\s*=\s*["'][^"']+["'])[^>]*\/?>/i;

export interface RenderAttachmentRef {
  id: string;
  version: number;
  tag: string;
}

const getLatestAttachmentOfType = (
  attachments: VersionedAttachment[],
  type: string
): VersionedAttachment | undefined => {
  const ofType = attachments.filter((attachment) => attachment.type === type);
  return ofType[ofType.length - 1];
};

/**
 * Latest current-version data among attachments of the given type
 * (filters by type, then takes the last match).
 */
export const getLatestAttachmentData = <T>(
  attachments: VersionedAttachment[],
  type: string
): T | undefined => {
  const latest = getLatestAttachmentOfType(attachments, type);
  if (!latest) {
    return undefined;
  }
  return getLatestVersion<T>(latest as VersionedAttachment<string, T>)?.data;
};

/**
 * All version payloads for the latest attachment of the given type, ordered
 * by version number. Used to assert multi-turn updates (each manage_rule call
 * appends a version).
 */
export const getAttachmentVersionData = <T>(
  attachments: VersionedAttachment[],
  type: string
): T[] => {
  const latest = getLatestAttachmentOfType(attachments, type);
  if (!latest) {
    return [];
  }
  return [...latest.versions]
    .sort((left, right) => left.version - right.version)
    .map((version) => version.data as T);
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

const getAttachments = (output: TaskOutput): VersionedAttachment[] => {
  const attachments = (output as { attachments?: VersionedAttachment[] })?.attachments;
  return Array.isArray(attachments) ? attachments : [];
};

/** Distinct attachment types that were referenced by `<render_attachment>` tags. */
const getRenderedAttachmentTypes = (
  refs: RenderAttachmentRef[],
  attachments: VersionedAttachment[]
): string[] => [
  ...new Set(
    refs
      .map((ref) => attachments.find((attachment) => attachment.id === ref.id)?.type)
      .filter((type): type is string => typeof type === 'string' && type.length > 0)
  ),
];

const UNNAMED_CHECK = '';

const isCheckRecord = (value: unknown): value is AttachmentDataChecks =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0 &&
  Object.values(value).every((check) => typeof check === 'function');

/** Normalizes `expectAttachmentData` into named checks; a bare function becomes one unnamed check. */
const toAttachmentDataChecks = (
  value: RuleManagementExample['output']['expectAttachmentData'] | undefined
): AttachmentDataChecks | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'function') {
    return { [UNNAMED_CHECK]: value };
  }
  if (!isCheckRecord(value)) {
    throw new Error(
      'expectAttachmentData must be a function or a non-empty record of named check functions'
    );
  }
  return value;
};

const runCheck = async (
  check: ExpectAttachmentDataFn,
  attachments: VersionedAttachment[]
): Promise<string | null> => {
  try {
    await check(attachments);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const ATTACHMENT_DATA_CHECK_PREFIX = 'AttachmentData:';

/** Distinct named attachment-data checks across examples, in first-seen order. */
export const collectAttachmentDataCheckNames = (
  examples: readonly RuleManagementExample[]
): string[] => [
  ...new Set(
    examples.flatMap(({ output }) =>
      Object.keys(toAttachmentDataChecks(output.expectAttachmentData) ?? {}).filter(
        (name) => name !== UNNAMED_CHECK
      )
    )
  ),
];

/** Scores one named attachment-data check; examples that don't define it are skipped. */
export const createAttachmentDataCheckEvaluator = (
  checkName: string
): Evaluator<RuleManagementExample, TaskOutput> => ({
  name: `${ATTACHMENT_DATA_CHECK_PREFIX}${checkName}`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const check = toAttachmentDataChecks(expected?.expectAttachmentData)?.[checkName];
    if (check == null) {
      return skippedResult(`No "${checkName}" attachment-data check for this example`);
    }

    const attachments = getAttachments(output);
    const failure = await runCheck(check, attachments);
    return {
      score: failure === null ? 1 : 0,
      ...(failure === null ? {} : { explanation: failure }),
      metadata: attachmentListMetadata(attachments),
    };
  },
});

const attachmentListMetadata = (attachments: VersionedAttachment[]) => ({
  attachmentCount: attachments.length,
  attachmentTypes: attachments.map((attachment) => attachment.type),
});

export const createExpectedRenderAttachmentEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedRenderAttachment',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const requiredTypes = requireNonEmptyStringList(
      expected?.expectRenderAttachment,
      'expectRenderAttachment',
      'attachment types'
    );
    if (requiredTypes.length === 0) {
      return skippedResult('No render-attachment expectation for this example');
    }

    const assistantMessages = getAssistantMessages(output);
    const matchedRefs = assistantMessages.flatMap((message) =>
      parseAllRenderAttachmentRefs(message)
    );
    const attachments = getAttachments(output);
    const renderedTypes = getRenderedAttachmentTypes(matchedRefs, attachments);
    const missingTypes = requiredTypes.filter((type) => !renderedTypes.includes(type));

    return {
      score: matchedRefs.length > 0 && missingTypes.length === 0 ? 1 : 0,
      metadata: {
        expectRenderAttachment: requiredTypes,
        matchedTags: matchedRefs.map((ref) => ref.tag),
        renderedTypes,
        missingTypes,
        assistantMessageCount: assistantMessages.length,
      },
    };
  },
});

export const createExpectedAttachmentDataEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedAttachmentData',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const checks = toAttachmentDataChecks(expected?.expectAttachmentData);
    if (checks == null) {
      return skippedResult('No attachment-data expectation for this example');
    }

    const attachments = getAttachments(output);
    const failures: Array<{ name: string; message: string }> = [];
    for (const [name, check] of Object.entries(checks)) {
      const message = await runCheck(check, attachments);
      if (message !== null) {
        failures.push({ name, message });
      }
    }
    const metadata = {
      ...attachmentListMetadata(attachments),
      failedChecks: failures.map(({ name }) => name).filter((name) => name !== UNNAMED_CHECK),
    };

    if (failures.length === 0) {
      return { score: 1, metadata };
    }
    return {
      score: 0,
      explanation: failures
        .map(({ name, message }) => (name === UNNAMED_CHECK ? message : `[${name}] ${message}`))
        .join('\n'),
      metadata,
    };
  },
});
