/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '@kbn/onechat-common';
import { groupConversationsByTime } from './group_conversations';
import moment from 'moment';

const sections = {
  Today: 'Today',
  Yesterday: 'Yesterday',
  LastWeek: 'Last Week',
  Last2Weeks: 'Last 2 Weeks',
  LastMonth: 'Last Month',
  Last3Months: 'Last 3 Months',
  Older: 'Older',
};

describe('groupConversationsByTime', () => {
  let now: string;

  beforeEach(() => {
    now = moment().toISOString();
  });

  const createMockConversation = (id: string, updatedAt: string): Conversation => ({
    id,
    agent_id: 'test-agent',
    user: { id: 'test-user', username: 'Test User' },
    title: `Conversation ${id}`,
    created_at: updatedAt,
    updated_at: updatedAt,
    rounds: [],
  });

  it('should return empty array when no conversations are provided', () => {
    const result = groupConversationsByTime([]);
    expect(result).toEqual([]);
  });

  it('should group conversations by Today section', () => {
    const todayConversation = createMockConversation('1', now);
    const result = groupConversationsByTime([todayConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Today);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group conversations by Yesterday section', () => {
    const yesterdayTime = moment(now).subtract(1, 'day').toISOString();
    const yesterdayConversation = createMockConversation('1', yesterdayTime);
    const result = groupConversationsByTime([yesterdayConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Yesterday);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group conversations by Last Week section', () => {
    const lastWeekTime = moment(now).subtract(5, 'days').toISOString();
    const lastWeekConversation = createMockConversation('1', lastWeekTime);
    const result = groupConversationsByTime([lastWeekConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.LastWeek);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group conversations by Last 2 Weeks section', () => {
    const last2WeeksTime = moment(now).subtract(10, 'days').toISOString();
    const last2WeeksConversation = createMockConversation('1', last2WeeksTime);
    const result = groupConversationsByTime([last2WeeksConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Last2Weeks);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group conversations by Last Month section', () => {
    const lastMonthTime = moment(now).subtract(20, 'days').toISOString();
    const lastMonthConversation = createMockConversation('1', lastMonthTime);
    const result = groupConversationsByTime([lastMonthConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.LastMonth);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group conversations by Last 3 Months section', () => {
    const last3MonthsTime = moment(now).subtract(60, 'days').toISOString();
    const last3MonthsConversation = createMockConversation('1', last3MonthsTime);
    const result = groupConversationsByTime([last3MonthsConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Last3Months);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group conversations by Older section', () => {
    const olderTime = moment(now).subtract(120, 'days').toISOString();
    const olderConversation = createMockConversation('1', olderTime);
    const result = groupConversationsByTime([olderConversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Older);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[0].conversations[0].id).toBe('1');
  });

  it('should group multiple conversations into different sections', () => {
    const conversations = [
      createMockConversation('1', now), // Today
      createMockConversation('2', moment(now).subtract(1, 'day').toISOString()), // Yesterday
      createMockConversation('3', moment(now).subtract(5, 'days').toISOString()), // Last Week
      createMockConversation('4', moment(now).subtract(120, 'days').toISOString()), // Older
    ];

    const result = groupConversationsByTime(conversations);

    expect(result).toHaveLength(4);
    expect(result[0].label).toBe(sections.Today);
    expect(result[0].conversations).toHaveLength(1);
    expect(result[1].label).toBe(sections.Yesterday);
    expect(result[1].conversations).toHaveLength(1);
    expect(result[2].label).toBe(sections.LastWeek);
    expect(result[2].conversations).toHaveLength(1);
    expect(result[3].label).toBe(sections.Older);
    expect(result[3].conversations).toHaveLength(1);
  });

  it('should sort conversations within each section by updatedAt (most recent first)', () => {
    const todayEarlier = moment(now).subtract(2, 'hours').toISOString();
    const todayLater = moment(now).subtract(1, 'hour').toISOString();

    const conversations = [
      createMockConversation('1', todayEarlier),
      createMockConversation('2', todayLater),
    ];

    const result = groupConversationsByTime(conversations);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Today);
    expect(result[0].conversations).toHaveLength(2);
    // Most recent should be first
    expect(result[0].conversations[0].id).toBe('2');
    expect(result[0].conversations[1].id).toBe('1');
  });

  it('should maintain section order as defined in orderedSections', () => {
    const conversations = [
      createMockConversation('older', moment(now).subtract(120, 'days').toISOString()),
      createMockConversation('today', now),
      createMockConversation('lastWeek', moment(now).subtract(5, 'days').toISOString()),
    ];

    const result = groupConversationsByTime(conversations);

    expect(result).toHaveLength(3);
    // Should be ordered: Today, Last Week, Older (not by input order)
    expect(result[0].label).toBe(sections.Today);
    expect(result[1].label).toBe(sections.LastWeek);
    expect(result[2].label).toBe(sections.Older);
  });

  it('should handle edge case of exactly 1 day difference', () => {
    const exactlyOneDayAgo = moment(now).subtract(1, 'day').toISOString();
    const conversation = createMockConversation('1', exactlyOneDayAgo);
    const result = groupConversationsByTime([conversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Yesterday);
  });

  it('should handle edge case of exactly 7 days difference', () => {
    const exactly7DaysAgo = moment(now).subtract(7, 'days').toISOString();
    const conversation = createMockConversation('1', exactly7DaysAgo);
    const result = groupConversationsByTime([conversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.LastWeek);
  });

  it('should handle edge case of exactly 14 days difference', () => {
    const exactly14DaysAgo = moment(now).subtract(14, 'days').toISOString();
    const conversation = createMockConversation('1', exactly14DaysAgo);
    const result = groupConversationsByTime([conversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Last2Weeks);
  });

  it('should handle edge case of exactly 30 days difference', () => {
    const exactly30DaysAgo = moment(now).subtract(30, 'days').toISOString();
    const conversation = createMockConversation('1', exactly30DaysAgo);
    const result = groupConversationsByTime([conversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.LastMonth);
  });

  it('should handle edge case of exactly 90 days difference', () => {
    const exactly90DaysAgo = moment(now).subtract(90, 'days').toISOString();
    const conversation = createMockConversation('1', exactly90DaysAgo);
    const result = groupConversationsByTime([conversation]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Last3Months);
  });

  it('should handle multiple conversations in the same section', () => {
    const conversations = [
      createMockConversation('1', now),
      createMockConversation('2', moment(now).subtract(1, 'hours').toISOString()),
      createMockConversation('3', moment(now).subtract(3, 'hours').toISOString()),
    ];

    const result = groupConversationsByTime(conversations);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Today);
    expect(result[0].conversations).toHaveLength(3);
    // Should be sorted by most recent first
    expect(result[0].conversations[0].id).toBe('1');
    expect(result[0].conversations[1].id).toBe('2');
    expect(result[0].conversations[2].id).toBe('3');
  });

  it('should only return sections that have conversations', () => {
    const conversations = [
      createMockConversation('1', now), // Today
      createMockConversation('2', moment(now).subtract(120, 'days').toISOString()), // Older
    ];

    const result = groupConversationsByTime(conversations);

    expect(result).toHaveLength(2);
    expect(result[0].label).toBe(sections.Today);
    expect(result[1].label).toBe(sections.Older);
    // Should not include empty sections like Yesterday, Last Week, etc.
  });

  it('should handle invalid date strings gracefully', () => {
    const conversationWithInvalidDate = createMockConversation('1', 'invalid-date');

    // This should not throw an error, moment will handle invalid dates
    expect(() => groupConversationsByTime([conversationWithInvalidDate])).not.toThrow();

    const result = groupConversationsByTime([conversationWithInvalidDate]);
    // Invalid dates typically result in NaN diff values, so should go to Older
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe(sections.Older);
  });
});
