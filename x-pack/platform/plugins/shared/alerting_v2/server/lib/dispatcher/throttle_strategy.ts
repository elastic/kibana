/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicy } from './types';

export type EffectiveThrottleStrategy = NonNullable<
  NonNullable<ActionPolicy['throttle']>['strategy']
>;

/**
 * Strategy the dispatcher throttles with. A policy without `throttle` is not unthrottled: it
 * notifies on status change per alert, or once per interval for the other grouping modes.
 */
export const effectiveThrottleStrategyOf = ({
  throttle,
  grouping,
}: ActionPolicy): EffectiveThrottleStrategy =>
  throttle?.strategy ?? (grouping.mode === 'per_alert' ? 'on_status_change' : 'time_interval');
