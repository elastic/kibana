/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TASK_STATUSES = [
  'idle',
  'claiming',
  'running',
  'failed',
  'dead_letter',
  'should_delete',
  'unrecognized',
] as const;

/** Task list status filter that lists the stored and removed tasks that failed in the run history window. */
export const FAILED_IN_WINDOW_FILTER = 'failed_in_window';

const STATUS_LABELS: Record<string, string> = {
  idle: i18n.translate('xpack.taskManagerUi.status.idle', { defaultMessage: 'Idle' }),
  claiming: i18n.translate('xpack.taskManagerUi.status.claiming', { defaultMessage: 'Claiming' }),
  running: i18n.translate('xpack.taskManagerUi.status.running', { defaultMessage: 'Running' }),
  failed: i18n.translate('xpack.taskManagerUi.status.failed', { defaultMessage: 'Failed' }),
  dead_letter: i18n.translate('xpack.taskManagerUi.status.deadLetter', {
    defaultMessage: 'Dead letter',
  }),
  should_delete: i18n.translate('xpack.taskManagerUi.status.shouldDelete', {
    defaultMessage: 'Pending deletion',
  }),
  unrecognized: i18n.translate('xpack.taskManagerUi.status.unrecognized', {
    defaultMessage: 'Unrecognized',
  }),
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'default',
  claiming: 'primary',
  running: 'primary',
  failed: 'danger',
  dead_letter: 'danger',
  should_delete: 'default',
  unrecognized: 'warning',
};

export const getStatusLabel = (status: string): string => STATUS_LABELS[status] ?? status;

export const getStatusColor = (status: string): string => STATUS_COLORS[status] ?? 'default';
