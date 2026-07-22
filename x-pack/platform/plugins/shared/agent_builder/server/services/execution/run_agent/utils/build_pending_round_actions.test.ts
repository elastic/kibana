/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  createAskUserQuestionStep,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { buildPendingRoundActions } from './build_pending_round_actions';

describe('buildPendingRoundActions', () => {
  const baseRound = {
    id: 'r1',
    status: ConversationRoundStatus.awaitingPrompt,
    input: { message: '', attachments: [] },
    started_at: '2026-06-04T00:00:00.000Z',
    time_to_first_token: 0,
    time_to_last_token: 0,
    response: { message: '' },
  } as any;

  it('concatenates roundToActions output and pending ask_user_question actions, and returns consumedPromptIds', () => {
    const askStep = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [
        {
          question: 'Pick color',
          options: [{ label: 'red' }, { label: 'blue' }],
          multi_select: false,
        },
      ],
    });
    const round: ConversationRound = {
      ...baseRound,
      steps: [askStep],
    };
    const promptState = {
      responses: {
        s1: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [0] }] },
        },
      },
    } as any;

    const result = buildPendingRoundActions({
      round,
      promptState,
      toolIdMapping: new Map(),
      eventEmitter: jest.fn(),
    });

    expect(result.actions.length).toBeGreaterThanOrEqual(2);
    expect(result.consumedPromptIds).toEqual(['s1']);
  });
});
