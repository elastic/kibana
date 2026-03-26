/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamResponse } from '../../../../../../common';
import * as i18n from '../translations';

export const STATUS_COLOR_MAP: Record<DataStreamResponse['status'], string> = {
  pending: 'default',
  processing: 'primary',
  completed: 'success',
  failed: 'danger',
  cancelled: 'warning',
  approved: 'success',
  deleting: 'default',
};

export const STATUS_ICON_MAP: Record<DataStreamResponse['status'], string> = {
  pending: '',
  processing: '',
  completed: 'dot',
  failed: 'cross',
  cancelled: 'minusInCircle',
  approved: 'check',
  deleting: '',
};

export const STATUS_TEXT_MAP: Record<DataStreamResponse['status'], string> = {
  pending: i18n.STATUS_LABELS.analyzing,
  processing: i18n.STATUS_LABELS.analyzing,
  completed: i18n.STATUS_LABELS.success,
  failed: i18n.STATUS_LABELS.failed,
  cancelled: i18n.STATUS_LABELS.cancelled,
  approved: i18n.STATUS_LABELS.approved,
  deleting: i18n.STATUS_LABELS.deleting,
};
