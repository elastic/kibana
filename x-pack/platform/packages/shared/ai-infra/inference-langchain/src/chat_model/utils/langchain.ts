/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MessageContentComplex,
  MessageContentImageUrl,
  MessageContentText,
} from '@langchain/core/messages';

/**
 * Type guard for image_url message content
 */
export function isMessageContentImageUrl(
  content: MessageContentComplex
): content is MessageContentImageUrl {
  return content.type === 'image_url';
}

/**
 * Type guard for text message content
 */
export function isMessageContentText(
  content: MessageContentComplex
): content is MessageContentText {
  return content.type === 'text';
}
