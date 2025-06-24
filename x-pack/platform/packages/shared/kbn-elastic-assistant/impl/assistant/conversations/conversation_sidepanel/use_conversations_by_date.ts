/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { orderBy } from 'lodash';
import { Conversation } from '../../../..';
import { getAbsoluteTime, isValidDateMath } from './date_utils';

export function useConversationsByDate(conversations: Conversation[] = []) {
  return useMemo(() => {
    const now = new Date();

    const startOfToday = getAbsoluteTime('now/d', { forceNow: now }) ?? 0;
    const startOfYesterday = getAbsoluteTime('now-1d/d', { forceNow: now }) ?? 0;
    const startOfThisWeek = getAbsoluteTime('now/w', { forceNow: now }) ?? 0;
    const startOfLastWeek = getAbsoluteTime('now-1w/w', { forceNow: now }) ?? 0;
    const startOfThisMonth = getAbsoluteTime('now/M', { forceNow: now }) ?? 0;
    const startOfLastMonth = getAbsoluteTime('now-1M/M', { forceNow: now }) ?? 0;
    const startOfThisYear = getAbsoluteTime('now/y', { forceNow: now }) ?? 0;

    const categorizedConversations: Record<string, Conversation[]> = {
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      LAST_WEEK: [],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [],
    };
    orderBy(conversations, 'updatedAt', 'desc').forEach((conversation) => {
      if (!conversation.updatedAt) {
        return;
      }
      if (!isValidDateMath(conversation.updatedAt)) {
        return;
      }
      const updatedAt = new Date(conversation.updatedAt).getTime();

      const displayedConversation = conversation;

      if (updatedAt >= startOfToday) {
        categorizedConversations.TODAY.push(displayedConversation);
      } else if (updatedAt >= startOfYesterday) {
        categorizedConversations.YESTERDAY.push(displayedConversation);
      } else if (updatedAt >= startOfThisWeek) {
        categorizedConversations.THIS_WEEK.push(displayedConversation);
      } else if (updatedAt >= startOfLastWeek) {
        categorizedConversations.LAST_WEEK.push(displayedConversation);
      } else if (updatedAt >= startOfThisMonth) {
        categorizedConversations.THIS_MONTH.push(displayedConversation);
      } else if (updatedAt >= startOfLastMonth) {
        categorizedConversations.LAST_MONTH.push(displayedConversation);
      } else if (updatedAt >= startOfThisYear) {
        categorizedConversations.THIS_YEAR.push(displayedConversation);
      } else {
        categorizedConversations.OLDER.push(displayedConversation);
      }
    });

    return categorizedConversations;
  }, [conversations]);
}
