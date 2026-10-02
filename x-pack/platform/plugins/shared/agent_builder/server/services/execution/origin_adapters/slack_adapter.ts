/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationSourceType, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { OriginAdapter } from './types';

/**
 * Turns the reply of a completed round into a raw Slack payload, keeping the message text as is.
 */
export const slackAdapter: OriginAdapter<ConversationSourceType.Slack> = {
  type: ConversationSourceType.Slack,
  project: (event) => {
    if (!isRoundCompleteEvent(event)) {
      return undefined;
    }

    const { message } = event.data.round.response;
    if (!message) {
      return undefined;
    }

    return { text: message, blocks: [{ type: 'markdown', text: message }] };
  },
};
