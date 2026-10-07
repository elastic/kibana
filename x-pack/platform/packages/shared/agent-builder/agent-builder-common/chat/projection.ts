/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raw Slack message payload: `text` is the notification and fallback copy, `blocks` is what gets
 * posted, as Slack `markdown` blocks that render standard markdown.
 */
export interface SlackPayload {
  text: string;
  blocks: Array<{ type: 'markdown'; text: string }>;
}

/**
 * Output produced by chat event hooks for external surfaces, keyed by round origin type.
 */
export interface OriginProjection {
  slack?: SlackPayload;
}
