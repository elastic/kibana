/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType, ConversationRoundStatus } from '@kbn/agent-builder-common';
import { createEmptyConversation, createRound } from '../../../test_utils/conversations';
import {
  eventsNativeConversation,
  pausedRoundTimeline,
  pausedThenInterruptedResumeTimeline,
} from '../../../test_utils/timeline';
import { getPendingResumeRound, resolveTelemetryOrigin } from './pending_round';

describe('getPendingResumeRound', () => {
  it('returns the compat round for an unanswered pause', () => {
    const conversation = eventsNativeConversation(pausedRoundTimeline());
    expect(getPendingResumeRound(conversation)?.id).toBe('r1');
    expect(getPendingResumeRound(conversation)?.status).toBe(
      ConversationRoundStatus.awaitingPrompt
    );
  });

  it('is undefined on a stale document whose stored rounds say awaiting_prompt but whose events consumed the prompt', () => {
    const conversation = {
      ...eventsNativeConversation(pausedThenInterruptedResumeTimeline()),
      rounds: [createRound({ id: 'r1', status: ConversationRoundStatus.awaitingPrompt })],
    };
    expect(getPendingResumeRound(conversation)).toBeUndefined();
  });

  it('reads a legacy rounds-only document through roundsToEvents', () => {
    const conversation = createEmptyConversation({
      rounds: [
        createRound({
          id: 'r1',
          status: ConversationRoundStatus.awaitingPrompt,
          pending_prompts: [],
        }),
      ],
    });
    expect(getPendingResumeRound(conversation)?.id).toBe('r1');
  });
});

describe('resolveTelemetryOrigin', () => {
  it('prefers the request origin, else the pending round origin, else undefined', () => {
    const paused = eventsNativeConversation(pausedRoundTimeline());
    expect(
      resolveTelemetryOrigin({ conversation: paused, requestOrigin: ConversationOriginType.Slack })
    ).toBe(ConversationOriginType.Slack);
    expect(
      resolveTelemetryOrigin({
        conversation: eventsNativeConversation(pausedThenInterruptedResumeTimeline()),
      })
    ).toBeUndefined();
    expect(resolveTelemetryOrigin({})).toBeUndefined();
  });
});
