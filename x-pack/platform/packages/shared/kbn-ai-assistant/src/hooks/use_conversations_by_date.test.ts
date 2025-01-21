/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useConversationsByDate } from './use_conversations_by_date';
import { getAbsoluteTime, isValidDateMath } from '../utils/date';
import { Conversation } from '@kbn/observability-ai-assistant-plugin/common';

jest.mock('../utils/date', () => ({
  getAbsoluteTime: jest.fn(),
  isValidDateMath: jest.fn(),
}));

const getDisplayedConversation = (conversation: Conversation) => {
  return {
    id: conversation.conversation.id,
    label: conversation.conversation.title,
    lastUpdated: conversation.conversation.last_updated,
    href: `/conversation/${conversation.conversation.id}`,
  };
};

describe('useConversationsByDate', () => {
  const now = new Date();
  const todayStart = new Date('2025-01-21T00:00:00Z').valueOf();
  const yesterdayStart = new Date('2025-01-20T00:00:00Z').valueOf();
  const thisWeekStart = new Date('2025-01-19T00:00:00Z').valueOf();
  const lastWeekStart = new Date('2025-01-12T00:00:00Z').valueOf();
  const thisMonthStart = new Date('2025-01-01T00:00:00Z').valueOf();
  const lastMonthStart = new Date('2024-12-01T00:00:00Z').valueOf();
  const thisYearStart = new Date('2025-01-01T00:00:00Z').valueOf();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);

    (getAbsoluteTime as jest.Mock).mockImplementation((range: string) => {
      switch (range) {
        case 'now/d':
          return todayStart;
        case 'now-1d/d':
          return yesterdayStart;
        case 'now/w':
          return thisWeekStart;
        case 'now-1w/w':
          return lastWeekStart;
        case 'now/M':
          return thisMonthStart;
        case 'now-1M/M':
          return lastMonthStart;
        case 'now/y':
          return thisYearStart;
        default:
          return undefined;
      }
    });

    (isValidDateMath as jest.Mock).mockImplementation((value: string) => {
      const validTimestamps = [
        new Date(todayStart + 5 * 60 * 60 * 1000).toISOString(),
        new Date(yesterdayStart + 5 * 60 * 60 * 1000).toISOString(),
        new Date(lastWeekStart + 5 * 60 * 60 * 1000).toISOString(),
        new Date(lastMonthStart + 5 * 60 * 60 * 1000).toISOString(),
        '2024-05-01T10:00:00Z',
      ];
      return validTimestamps.includes(value);
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const mockConversations = [
    {
      conversation: {
        id: '1',
        title: `Today's Conversation`,
        last_updated: new Date(todayStart + 5 * 60 * 60 * 1000).toISOString(),
      },
      '@timestamp': new Date(todayStart + 5 * 60 * 60 * 1000).toISOString(),
      labels: {},
      numeric_labels: {},
      messages: [],
      namespace: 'namespace-1',
      public: true,
    },
    {
      conversation: {
        id: '2',
        title: `Yesterday's Conversation`,
        last_updated: new Date(yesterdayStart + 5 * 60 * 60 * 1000).toISOString(),
      },
      '@timestamp': new Date(yesterdayStart + 5 * 60 * 60 * 1000).toISOString(),
      labels: {},
      numeric_labels: {},
      messages: [],
      namespace: 'namespace-2',
      public: true,
    },
    {
      conversation: {
        id: '3',
        title: `Last Week's Conversation`,
        last_updated: new Date(lastWeekStart + 5 * 60 * 60 * 1000).toISOString(),
      },
      '@timestamp': new Date(lastWeekStart + 5 * 60 * 60 * 1000).toISOString(),
      labels: {},
      numeric_labels: {},
      messages: [],
      namespace: 'namespace-3',
      public: true,
    },
    {
      conversation: {
        id: '4',
        title: 'Older Conversation',
        last_updated: '2024-05-01T10:00:00Z',
      },
      '@timestamp': '2024-05-01T10:00:00Z',
      labels: {},
      numeric_labels: {},
      messages: [],
      namespace: 'namespace-4',
      public: true,
    },
  ];

  it('categorizes conversations by date', () => {
    const { result } = renderHook(() =>
      useConversationsByDate(mockConversations, (id) => `/conversation/${id}`)
    );

    expect(result.current).toEqual({
      TODAY: [getDisplayedConversation(mockConversations[0])],
      YESTERDAY: [getDisplayedConversation(mockConversations[1])],
      THIS_WEEK: [],
      LAST_WEEK: [getDisplayedConversation(mockConversations[2])],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [getDisplayedConversation(mockConversations[3])],
    });
  });

  it('handles invalid timestamps gracefully', () => {
    const invalidConversations = [
      {
        ...mockConversations[0],
        conversation: { id: '5', title: 'Invalid Timestamp', last_updated: 'invalid-date' },
      },
    ];

    const { result } = renderHook(() => useConversationsByDate(invalidConversations));

    expect(result.current).toEqual({
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      LAST_WEEK: [],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [],
    });
  });

  it('handles undefined timestamps in conversations', () => {
    const undefinedTimestampConversations = [
      {
        ...mockConversations[0],
        conversation: { id: '6', title: 'No Timestamp', last_updated: undefined },
      },
    ];

    // @ts-expect-error date is forced to be undefined for testing purposes
    const { result } = renderHook(() => useConversationsByDate(undefinedTimestampConversations));

    expect(result.current).toEqual({
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      LAST_WEEK: [],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [],
    });
  });

  it('handles undefined conversations input gracefully', () => {
    const { result } = renderHook(() => useConversationsByDate(undefined));

    expect(result.current).toEqual({
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      LAST_WEEK: [],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [],
    });
  });

  it('returns empty categories when no conversations are provided', () => {
    const { result } = renderHook(() => useConversationsByDate([]));

    expect(result.current).toEqual({
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      LAST_WEEK: [],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [],
    });
  });
});
