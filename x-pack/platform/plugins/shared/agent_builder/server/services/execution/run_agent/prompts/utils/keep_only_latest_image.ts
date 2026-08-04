/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HumanMessage,
  isHumanMessage,
  type BaseMessage,
  type BaseMessageLike,
} from '@langchain/core/messages';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain/messages';

/** Replaces dropped prior screenshots so the model knows why an image is missing. */
export const PRIOR_SCREENSHOT_OMITTED_STUB =
  '[Prior screenshot omitted — only the latest visual QA image is kept in context.]';

type ContentPart = { type?: string; text?: string; image_url?: unknown };

const isImageUrlPart = (part: unknown): part is ContentPart => {
  return (
    typeof part === 'object' &&
    part !== null &&
    (part as ContentPart).type === 'image_url' &&
    'image_url' in (part as object)
  );
};

const getHumanContentParts = (message: BaseMessageLike): ContentPart[] | undefined => {
  // BaseMessageLike also allows role/content tuples (e.g. ['system', '...']); those
  // are not HumanMessage instances and must be skipped before isHumanMessage().
  if (
    !message ||
    typeof message !== 'object' ||
    Array.isArray(message) ||
    typeof (message as BaseMessage).getType !== 'function' ||
    !isHumanMessage(message as BaseMessage)
  ) {
    return undefined;
  }

  const { content } = message as HumanMessage;
  if (!Array.isArray(content)) {
    return undefined;
  }
  return content as ContentPart[];
};

const hasImageUrlParts = (message: BaseMessageLike): boolean => {
  const parts = getHumanContentParts(message);
  return parts?.some(isImageUrlPart) === true;
};

const stripImageUrlParts = (message: BaseMessageLike): BaseMessageLike => {
  const parts = getHumanContentParts(message);
  if (!parts) {
    return message;
  }

  const nextParts: ContentPart[] = [];
  let omittedCount = 0;
  for (const part of parts) {
    if (isImageUrlPart(part)) {
      omittedCount += 1;
      continue;
    }
    nextParts.push(part);
  }

  if (omittedCount === 0) {
    return message;
  }

  const stub =
    omittedCount === 1
      ? PRIOR_SCREENSHOT_OMITTED_STUB
      : `[${omittedCount} prior screenshots omitted — only the latest visual QA image is kept in context.]`;

  nextParts.push({ type: 'text', text: stub });

  // Only text left (plus stub) — flatten to a plain string when possible for nicer prompts.
  const textOnly = nextParts.every((part) => part.type === 'text' && typeof part.text === 'string');
  if (textOnly) {
    return createUserMessage(nextParts.map((part) => part.text!).join('\n\n'));
  }

  return createUserMessage(nextParts as Parameters<typeof createUserMessage>[0]);
};

/**
 * Keeps multimodal `image_url` parts only on the chronologically last human
 * message that has them. Earlier screenshots become a short text stub.
 *
 * Covers both round `image_parts` (attachment screenshots) and mid-round
 * `UserImage` actions from browser screenshot tools.
 */
export const keepOnlyLatestImageUrlParts = (messages: BaseMessageLike[]): BaseMessageLike[] => {
  const imageIndexes: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (hasImageUrlParts(messages[i])) {
      imageIndexes.push(i);
    }
  }

  if (imageIndexes.length <= 1) {
    return messages;
  }

  const keepIndex = imageIndexes[imageIndexes.length - 1];
  return messages.map((message, index) => {
    if (!imageIndexes.includes(index) || index === keepIndex) {
      return message;
    }
    return stripImageUrlParts(message);
  });
};
