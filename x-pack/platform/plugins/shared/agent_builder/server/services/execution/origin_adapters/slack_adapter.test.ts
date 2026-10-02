/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType, type ChatEvent, type RoundCompleteEvent } from '@kbn/agent-builder-common';
import { createRound } from '../../../test_utils';
import { slackAdapter } from './slack_adapter';

const createRoundCompleteEvent = (message: string): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: { round: createRound({ response: { message } }) },
});

describe('slackAdapter', () => {
  it('wraps the reply as is in a Slack markdown payload', () => {
    const message = 'Here is the chart:\n\n<render_attachment id="a1" version="1" />';

    expect(slackAdapter.project(createRoundCompleteEvent(message))).toEqual({
      text: message,
      blocks: [{ type: 'markdown', text: message }],
    });
  });

  it('returns undefined for events other than round_complete', () => {
    const messageCompleteEvent: ChatEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'm1', message_content: 'Hello' },
    };

    expect(slackAdapter.project(messageCompleteEvent)).toBeUndefined();
  });

  it('returns undefined when the reply is empty', () => {
    expect(slackAdapter.project(createRoundCompleteEvent(''))).toBeUndefined();
  });
});
