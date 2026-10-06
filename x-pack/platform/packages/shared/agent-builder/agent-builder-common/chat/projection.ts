/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';

/**
 * Slack `markdown` block, which renders standard markdown. Used when the reply can't be rendered
 * as Block Kit.
 */
export interface SlackMarkdownBlock {
  type: 'markdown';
  text: string;
}

/**
 * Raw Slack message payload: `text` is the notification and fallback copy, `blocks` is what gets
 * posted.
 */
export interface SlackPayload {
  text: string;
  blocks: Array<SlackBlock | SlackMarkdownBlock>;
}

/**
 * Output produced by chat event hooks for external surfaces, keyed by round origin type.
 */
export interface OriginProjection {
  slack?: SlackPayload;
}
