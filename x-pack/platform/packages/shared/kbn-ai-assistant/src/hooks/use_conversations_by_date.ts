/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type Conversation } from '@kbn/observability-ai-assistant-plugin/public';
import { getAbsoluteTime } from '../utils/date';

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

    const categories: Record<string, Conversation[]> = {
      TODAY: [],
      YESTERDAY: [],
      THIS_WEEK: [],
      LAST_WEEK: [],
      THIS_MONTH: [],
      LAST_MONTH: [],
      THIS_YEAR: [],
      OLDER: [],
    };

    conversations.forEach((conversation) => {
      const lastUpdated = new Date(conversation.conversation.last_updated).valueOf();

      if (isNaN(lastUpdated)) {
        return;
      }

      if (lastUpdated >= startOfToday) {
        categories.TODAY.push(conversation);
      } else if (lastUpdated >= startOfYesterday) {
        categories.YESTERDAY.push(conversation);
      } else if (lastUpdated >= startOfThisWeek) {
        categories.THIS_WEEK.push(conversation);
      } else if (lastUpdated >= startOfLastWeek) {
        categories.LAST_WEEK.push(conversation);
      } else if (lastUpdated >= startOfThisMonth) {
        categories.THIS_MONTH.push(conversation);
      } else if (lastUpdated >= startOfLastMonth) {
        categories.LAST_MONTH.push(conversation);
      } else if (lastUpdated >= startOfThisYear) {
        categories.THIS_YEAR.push(conversation);
      } else {
        categories.OLDER.push(conversation);
      }
    });

    return categories;
  }, [conversations]);
}
