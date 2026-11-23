/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';

export const TIMEPICKER_FALLBACK: Readonly<TimeRange> = {
  from: 'now-15m',
  to: 'now',
};

export const ENABLED_TRIGGER_TABS = ['alert', 'index', 'event', 'manual', 'historical'] as const;
export const ENABLED_STEP_TRIGGER_TABS = ['manual', 'historical'] as const;
