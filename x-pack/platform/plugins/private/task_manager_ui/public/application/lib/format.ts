/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { TaskRunsSummary, TaskSummary } from '@kbn/task-manager-plugin/common';

export const EMPTY_VALUE = '-';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const roundTo1 = (value: number) => Math.round(value * 10) / 10;

export const formatDuration = (ms: number | undefined): string => {
  if (ms === undefined) {
    return EMPTY_VALUE;
  }
  if (ms < MS_PER_SECOND) {
    return i18n.translate('xpack.taskManagerUi.duration.milliseconds', {
      defaultMessage: '{value} ms',
      values: { value: Math.round(ms) },
    });
  }
  if (ms < MS_PER_MINUTE) {
    return i18n.translate('xpack.taskManagerUi.duration.seconds', {
      defaultMessage: '{value} s',
      values: { value: roundTo1(ms / MS_PER_SECOND) },
    });
  }
  if (ms < MS_PER_HOUR) {
    return i18n.translate('xpack.taskManagerUi.duration.minutes', {
      defaultMessage: '{value} min',
      values: { value: roundTo1(ms / MS_PER_MINUTE) },
    });
  }
  return i18n.translate('xpack.taskManagerUi.duration.hours', {
    defaultMessage: '{value} h',
    values: { value: roundTo1(ms / MS_PER_HOUR) },
  });
};

export const formatRelativeTime = (isoDate: string | null | undefined): string =>
  isoDate ? moment(isoDate).fromNow() : EMPTY_VALUE;

export const formatDateTime = (isoDate: string | null | undefined): string =>
  isoDate ? moment(isoDate).format('MMM D, YYYY @ HH:mm:ss.SSS') : EMPTY_VALUE;

export const formatSchedule = (schedule: TaskSummary['schedule']): string => {
  if (schedule?.interval) {
    return i18n.translate('xpack.taskManagerUi.schedule.interval', {
      defaultMessage: 'Every {interval}',
      values: { interval: schedule.interval },
    });
  }
  if (schedule?.rrule) {
    return i18n.translate('xpack.taskManagerUi.schedule.rrule', {
      defaultMessage: 'Custom schedule',
    });
  }
  return i18n.translate('xpack.taskManagerUi.schedule.oneTime', {
    defaultMessage: 'One-time',
  });
};

export const getRunCount = (runs: TaskRunsSummary | undefined): number =>
  runs ? runs.success + runs.failure : 0;

export const getFailureRate = (runs: TaskRunsSummary | undefined): number | undefined => {
  const total = getRunCount(runs);
  return runs && total > 0 ? runs.failure / total : undefined;
};

export const formatPercent = (ratio: number | undefined): string =>
  ratio === undefined ? EMPTY_VALUE : `${roundTo1(ratio * 100)}%`;
