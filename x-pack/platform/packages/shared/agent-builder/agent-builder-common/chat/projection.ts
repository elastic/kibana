/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import type { ConversationOriginType } from './conversation';

/**
 * Raw Slack message payload: `text` is the notification and fallback copy, `blocks` is what gets
 * posted.
 */
export interface SlackPayload {
  text: string;
  blocks: SlackBlock[];
}

/**
 * Output for external surfaces, keyed by round origin type. Added to `round_complete` events at
 * callback delivery, never stored.
 */
export interface OriginIsomerProjection {
  [ConversationOriginType.Slack]?: SlackPayload;
}
