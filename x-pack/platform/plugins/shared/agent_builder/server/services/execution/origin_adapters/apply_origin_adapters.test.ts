/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import {
  ChatEventType,
  ConversationSourceType,
  type ChatEvent,
  type ConversationSource,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createRound } from '../../../test_utils';
import { applyOriginAdapters } from './apply_origin_adapters';
import { slackAdapter } from './slack_adapter';

const slackSource = {
  type: ConversationSourceType.Slack,
  external_conversation_id: 'team:T1/channel:C1/thread:1',
};

const messageChunkEvent: ChatEvent = {
  type: ChatEventType.messageChunk,
  data: { message_id: 'm1', text_chunk: 'Hello' },
};

const createRoundCompleteEvent = (): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: { round: createRound({ response: { message: 'Hello world' } }) },
});

const logger = loggingSystemMock.createLogger();

const collect = (events: ChatEvent[], source: ConversationSource | undefined) =>
  lastValueFrom(of(...events).pipe(applyOriginAdapters({ source, logger }), toArray()));

describe('applyOriginAdapters', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes events through unchanged when the conversation has no source', async () => {
    const roundCompleteEvent = createRoundCompleteEvent();

    const [chunk, roundComplete] = await collect(
      [messageChunkEvent, roundCompleteEvent],
      undefined
    );

    expect(chunk).toBe(messageChunkEvent);
    expect(roundComplete).toBe(roundCompleteEvent);
  });

  it('adds the Slack output to round_complete events only', async () => {
    const roundCompleteEvent = createRoundCompleteEvent();

    const [chunk, roundComplete] = await collect(
      [messageChunkEvent, roundCompleteEvent],
      slackSource
    );

    expect(chunk).toBe(messageChunkEvent);
    expect(roundComplete).toEqual({
      ...roundCompleteEvent,
      projection: {
        slack: {
          text: 'Hello world',
          blocks: [{ type: 'markdown', text: 'Hello world' }],
        },
      },
    });
  });

  it('does not mutate the original event', async () => {
    const roundCompleteEvent = createRoundCompleteEvent();

    const [roundComplete] = await collect([roundCompleteEvent], slackSource);

    expect(roundComplete).not.toBe(roundCompleteEvent);
    expect(roundCompleteEvent).not.toHaveProperty('projection');
  });

  it('passes events through unchanged and keeps emitting when the adapter throws', async () => {
    jest.spyOn(slackAdapter, 'project').mockImplementation(() => {
      throw new Error('boom');
    });
    const roundCompleteEvent = createRoundCompleteEvent();

    const events = await collect([roundCompleteEvent, messageChunkEvent], slackSource);

    expect(events).toEqual([roundCompleteEvent, messageChunkEvent]);
    expect(events[0]).toBe(roundCompleteEvent);
    expect(logger.warn).toHaveBeenCalledWith(
      'Origin adapter "slack" failed on "round_complete" event: Error: boom'
    );
  });
});
