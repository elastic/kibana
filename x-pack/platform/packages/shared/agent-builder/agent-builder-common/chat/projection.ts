/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Slack `markdown` block, which renders standard markdown.
 */
export interface SlackMarkdownBlock {
  type: 'markdown';
  text: string;
}

/**
 * Raw Slack message payload: `text` is the notification and fallback copy, `blocks` is what gets posted.
 */
export interface SlackPayload {
  text: string;
  blocks: SlackMarkdownBlock[];
}

/**
 * Output produced by origin adapters, keyed by conversation source type.
 */
export interface OriginProjection {
  slack?: SlackPayload;
}
