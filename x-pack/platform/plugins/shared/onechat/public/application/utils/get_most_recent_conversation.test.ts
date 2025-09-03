/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/onechat-common';
import { getMostRecentConversation } from './get_most_recent_conversation';
import moment from 'moment';

describe('getMostRecentConversation', () => {
  let now: string;

  beforeEach(() => {
    now = moment().toISOString();
  });

  const createMockConversation = (id: string, updatedAt: string): ConversationWithoutRounds => ({
    id,
    agent_id: 'test-agent',
    user: { id: 'test-user', username: 'Test User' },
    title: `Conversation ${id}`,
    created_at: updatedAt,
    updated_at: updatedAt,
  });

  it('should return the only conversation when array has one item', () => {
    const conversation = createMockConversation('1', now);
    const result = getMostRecentConversation([conversation]);

    expect(result).toBeDefined();
    expect(result?.id).toBe('1');
  });

  it('should return the most recent conversation when multiple conversations exist', () => {
    const older = createMockConversation('1', moment(now).subtract(2, 'hours').toISOString());
    const newer = createMockConversation('2', moment(now).subtract(1, 'hour').toISOString());
    const oldest = createMockConversation('3', moment(now).subtract(3, 'hours').toISOString());

    const conversations = [older, newer, oldest];
    const result = getMostRecentConversation(conversations);

    expect(result).toBeDefined();
    expect(result?.id).toBe('2'); // The newest one
  });

  it('should handle conversations spanning different days', () => {
    const today = createMockConversation('today', now);
    const yesterday = createMockConversation(
      'yesterday',
      moment(now).subtract(1, 'day').toISOString()
    );
    const lastWeek = createMockConversation(
      'lastWeek',
      moment(now).subtract(7, 'days').toISOString()
    );

    const conversations = [yesterday, lastWeek, today];
    const result = getMostRecentConversation(conversations);

    expect(result?.id).toBe('today');
  });

  it('should handle edge case with millisecond differences', () => {
    const baseTime = moment(now);
    const earlier = createMockConversation('earlier', baseTime.toISOString());
    const later = createMockConversation('later', baseTime.add(1, 'millisecond').toISOString());

    const conversations = [earlier, later];
    const result = getMostRecentConversation(conversations);

    expect(result?.id).toBe('later');
  });
});
