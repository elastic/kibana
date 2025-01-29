/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type Conversation } from '@kbn/observability-ai-assistant-plugin/public';
import { getAbsoluteTime, isValidDateMath } from '../utils/date';

export function useConversationsByDate(
  conversations: Conversation[] = [],
  getConversationHref?: (id: string) => string
) {
  return useMemo(() => {
    const now = new Date();

    const startOfToday = getAbsoluteTime('now/d', { forceNow: now }) ?? 0;
    const startOfYesterday = getAbsoluteTime('now-1d/d', { forceNow: now }) ?? 0;
    const startOfThisWeek = getAbsoluteTime('now/w', { forceNow: now }) ?? 0;
    const startOfLastWeek = getAbsoluteTime('now-1w/w', { forceNow: now }) ?? 0;
    const startOfThisMonth = getAbsoluteTime('now/M', { forceNow: now }) ?? 0;
    const startOfLastMonth = getAbsoluteTime('now-1M/M', { forceNow: now }) ?? 0;
    const startOfThisYear = getAbsoluteTime('now/y', { forceNow: now }) ?? 0;

    const categorizedConversations: Record<
      string,
      Array<{ id: string; label: string; lastUpdated: string; href?: string }>
    > = {
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
      if (!isValidDateMath(conversation.conversation.last_updated)) {
        return;
      }

      const lastUpdated = new Date(conversation.conversation.last_updated).valueOf();
      const displayedConversation = {
        id: conversation.conversation.id,
        label: conversation.conversation.title,
        lastUpdated: conversation.conversation.last_updated,
        href: getConversationHref ? getConversationHref(conversation.conversation.id) : undefined,
      };

      if (lastUpdated >= startOfToday) {
        categorizedConversations.TODAY.push(displayedConversation);
      } else if (lastUpdated >= startOfYesterday) {
        categorizedConversations.YESTERDAY.push(displayedConversation);
      } else if (lastUpdated >= startOfThisWeek) {
        categorizedConversations.THIS_WEEK.push(displayedConversation);
      } else if (lastUpdated >= startOfLastWeek) {
        categorizedConversations.LAST_WEEK.push(displayedConversation);
      } else if (lastUpdated >= startOfThisMonth) {
        categorizedConversations.THIS_MONTH.push(displayedConversation);
      } else if (lastUpdated >= startOfLastMonth) {
        categorizedConversations.LAST_MONTH.push(displayedConversation);
      } else if (lastUpdated >= startOfThisYear) {
        categorizedConversations.THIS_YEAR.push(displayedConversation);
      } else {
        categorizedConversations.OLDER.push(displayedConversation);
      }
    });

    return categorizedConversations;
  }, [conversations, getConversationHref]);
}
