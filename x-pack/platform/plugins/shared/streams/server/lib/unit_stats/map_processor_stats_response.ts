/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { noRate, noValue } from './stats_values';

export const noProcessorStats = (): StreamsUnit.StatsProcessorResult => ({
  processing_duration: { average: noValue() },
  events: { incoming: { rate: noRate(), failures: { rate: noRate() } } },
});
