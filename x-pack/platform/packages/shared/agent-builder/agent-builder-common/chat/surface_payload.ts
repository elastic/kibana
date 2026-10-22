/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';

/**
 * Raw Slack message payload: `text` is the notification and fallback copy, `blocks` is what gets
 * posted.
 */
export interface SlackPayload {
  text: string;
  blocks: SlackBlock[];
}

/** The response message ready to post on the surface the round came from, such as Slack. */
export type SurfacePayload = SlackPayload;
