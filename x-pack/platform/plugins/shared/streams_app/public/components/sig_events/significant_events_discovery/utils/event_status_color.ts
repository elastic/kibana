/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIG_EVENT_STATUS_OPTIONS, type SigEventStatus } from '@kbn/streams-schema';

export const STATUS_COLORS: Record<SigEventStatus, string> = {
  promoted: 'danger',
  acknowledged: 'warning',
  resolved: 'success',
  demoted: 'default',
};

const isStatusOption = (v: string): v is SigEventStatus =>
  (SIG_EVENT_STATUS_OPTIONS as ReadonlyArray<string>).includes(v);

export const getStatusColor = (status: string): string =>
  isStatusOption(status) ? STATUS_COLORS[status] : 'default';
