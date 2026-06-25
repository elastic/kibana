/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const changeTypeIcons: Record<string, string> = {
  create: 'plusInCircle',
  update: 'pencil',
  delete: 'trash',
  rename: 'sortRight',
};

export const changeTypeColors: Record<string, 'success' | 'primary' | 'danger' | 'warning'> = {
  create: 'success',
  update: 'primary',
  delete: 'danger',
  rename: 'warning',
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return i18n.translate('xpack.streams.memory.relativeTime.justNow', {
      defaultMessage: 'just now',
    });
  }
  if (diffMinutes < 60) {
    return i18n.translate('xpack.streams.memory.relativeTime.minutesAgo', {
      defaultMessage: '{minutes}m ago',
      values: { minutes: diffMinutes },
    });
  }
  if (diffHours < 24) {
    return i18n.translate('xpack.streams.memory.relativeTime.hoursAgo', {
      defaultMessage: '{hours}h ago',
      values: { hours: diffHours },
    });
  }
  if (diffDays < 7) {
    return i18n.translate('xpack.streams.memory.relativeTime.daysAgo', {
      defaultMessage: '{days}d ago',
      values: { days: diffDays },
    });
  }
  return date.toLocaleDateString();
};
