/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConversationWithoutRounds } from '@kbn/onechat-common';
import moment from 'moment';

enum SectionGroup {
  Today,
  Yesterday,
  LastWeek,
  Last2Weeks,
  LastMonth,
  Last3Months,
  Older,
}

const toLabel = (section: SectionGroup): string => {
  switch (section) {
    case SectionGroup.Today:
      return i18n.translate('xpack.onechat.conversationSidebar.group.today', {
        defaultMessage: 'Today',
      });
    case SectionGroup.Yesterday:
      return i18n.translate('xpack.onechat.conversationSidebar.group.yesterday', {
        defaultMessage: 'Yesterday',
      });
    case SectionGroup.LastWeek:
      return i18n.translate('xpack.onechat.conversationSidebar.group.lastWeek', {
        defaultMessage: 'Last Week',
      });
    case SectionGroup.Last2Weeks:
      return i18n.translate('xpack.onechat.conversationSidebar.group.last2Weeks', {
        defaultMessage: 'Last 2 Weeks',
      });
    case SectionGroup.LastMonth:
      return i18n.translate('xpack.onechat.conversationSidebar.group.lastMonth', {
        defaultMessage: 'Last Month',
      });
    case SectionGroup.Last3Months:
      return i18n.translate('xpack.onechat.conversationSidebar.group.last3Months', {
        defaultMessage: 'Last 3 Months',
      });
    case SectionGroup.Older:
      return i18n.translate('xpack.onechat.conversationSidebar.group.older', {
        defaultMessage: 'Older',
      });
  }
};

const getTimeSection = (updatedAt: string): SectionGroup => {
  const updatedMoment = moment(updatedAt, moment.ISO_8601);
  // `diff` truncates the result to an integer
  const diffDays = moment().diff(updatedMoment, 'days');
  if (diffDays === 0) {
    return SectionGroup.Today;
  } else if (diffDays === 1) {
    return SectionGroup.Yesterday;
  } else if (diffDays <= 7) {
    return SectionGroup.LastWeek;
  } else if (diffDays <= 14) {
    return SectionGroup.Last2Weeks;
  } else if (diffDays <= 30) {
    return SectionGroup.LastMonth;
  } else if (diffDays <= 90) {
    return SectionGroup.Last3Months;
  } else {
    return SectionGroup.Older;
  }
};

interface TimeSection {
  label: string;
  conversations: ConversationWithoutRounds[];
}

const orderedSections = [
  SectionGroup.Today,
  SectionGroup.Yesterday,
  SectionGroup.LastWeek,
  SectionGroup.Last2Weeks,
  SectionGroup.LastMonth,
  SectionGroup.Last3Months,
  SectionGroup.Older,
];

export const groupConversationsByTime = (
  conversations: ConversationWithoutRounds[]
): TimeSection[] => {
  const groups: Record<SectionGroup, ConversationWithoutRounds[]> = {
    [SectionGroup.Today]: [],
    [SectionGroup.Yesterday]: [],
    [SectionGroup.LastWeek]: [],
    [SectionGroup.Last2Weeks]: [],
    [SectionGroup.LastMonth]: [],
    [SectionGroup.Last3Months]: [],
    [SectionGroup.Older]: [],
  };
  conversations.forEach((conversation) => {
    const section = getTimeSection(conversation.updated_at);
    groups[section].push(conversation);
  });

  // Sort conversations within each group by updated_at (most recent first)
  Object.values(groups).forEach((section) => {
    section.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  });

  return orderedSections
    .filter((section) => groups[section].length > 0)
    .map((section) => ({
      label: toLabel(section),
      conversations: groups[section],
    }));
};
