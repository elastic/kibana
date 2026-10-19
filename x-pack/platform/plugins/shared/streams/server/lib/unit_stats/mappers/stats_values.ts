/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { ITEM_UNIT, RATE_TIME_UNIT } from '../constants';

export type StatsValue = StreamsUnit.StatsDestinationResult['latency']['average'];
export type StatsRate = StreamsUnit.StatsDestinationResult['events']['incoming']['rate'];

/** A leaf with no data. The unit is null only when the value is. */
export const noValue = (): StatsValue => ({ value: null, unit: null });

export const noRate = (): StatsRate => ({ value: null, unit: null, time_unit: null });

export const toValue = (value: number | null, unit: string): StatsValue =>
  value === null ? noValue() : { value, unit };

/** A rate of items per second. */
export const toItemRate = (value: number | null): StatsRate =>
  value === null ? noRate() : { value, unit: ITEM_UNIT, time_unit: RATE_TIME_UNIT };

/** Total over the seconds the data covers. Null when there is no covered time. */
export const perSecond = (total: number, seconds: number | undefined): number | null =>
  seconds !== undefined && seconds > 0 ? total / seconds : null;
