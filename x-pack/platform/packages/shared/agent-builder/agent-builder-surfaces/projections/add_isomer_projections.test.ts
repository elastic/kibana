/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationOriginType,
  ConversationRoundStatus,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';
import { addIsomerProjections } from './add_isomer_projections';

const event: RoundCompleteEvent = {
  type: ChatEventType.roundComplete,
  data: {
    round: {
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      input: { message: 'user message' },
      response: { message: 'Hello' },
      steps: [],
      started_at: '2026-10-06T00:00:00.000Z',
      time_to_first_token: 0,
      time_to_last_token: 0,
      model_usage: { connector_id: 'unknown', input_tokens: 0, output_tokens: 0, llm_calls: 0 },
    },
  },
};

const context = {
  getMapping: () => undefined,
  getConversationUrl: () => 'http://localhost:5601',
  logger: loggerMock.create(),
};

describe('addIsomerProjections', () => {
  it('adds the projection of the round origin', () => {
    const projected = addIsomerProjections(event, {
      ...context,
      originType: ConversationOriginType.Slack,
    });

    expect(projected.projection?.slack?.text).toBe('Hello');
  });

  it('returns the event unchanged for rounds without an origin', () => {
    expect(addIsomerProjections(event, context)).toBe(event);
  });
});
