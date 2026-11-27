/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { SuggestionTimeRange } from './job_suggestion_service';

const RELATIVE_FROM = /^now-(\d+)([smhdwMy])$/;

const formatDuration: Record<string, (count: number) => string> = {
  s: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.seconds', {
      defaultMessage: '{count, plural, one {# second} other {# seconds}}',
      values: { count },
    }),
  m: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.minutes', {
      defaultMessage: '{count, plural, one {# minute} other {# minutes}}',
      values: { count },
    }),
  h: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.hours', {
      defaultMessage: '{count, plural, one {# hour} other {# hours}}',
      values: { count },
    }),
  d: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.days', {
      defaultMessage: '{count, plural, one {# day} other {# days}}',
      values: { count },
    }),
  w: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.weeks', {
      defaultMessage: '{count, plural, one {# week} other {# weeks}}',
      values: { count },
    }),
  M: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.months', {
      defaultMessage: '{count, plural, one {# month} other {# months}}',
      values: { count },
    }),
  y: (count) =>
    i18n.translate('xpack.ml.suggestADJobsFlyout.duration.years', {
      defaultMessage: '{count, plural, one {# year} other {# years}}',
      values: { count },
    }),
};

const formatDate = (value: string): string | undefined => {
  const date = moment(value, moment.ISO_8601, true);
  return date.isValid() ? date.format('lll') : undefined;
};

/**
 * Describes a time range in words, for example "Last 7 days". Ranges which are not
 * simply the last period are shown as dates, or as they were written.
 */
export const describeTimeRange = ({ from, to }: SuggestionTimeRange): string => {
  const relative = RELATIVE_FROM.exec(from);
  if (relative && to === 'now') {
    const [, count, unit] = relative;
    return i18n.translate('xpack.ml.suggestADJobsFlyout.lastDuration', {
      defaultMessage: 'Last {duration}',
      values: { duration: formatDuration[unit](Number(count)) },
    });
  }

  return i18n.translate('xpack.ml.suggestADJobsFlyout.timeRange', {
    defaultMessage: '{from} to {to}',
    values: { from: formatDate(from) ?? from, to: formatDate(to) ?? to },
  });
};
