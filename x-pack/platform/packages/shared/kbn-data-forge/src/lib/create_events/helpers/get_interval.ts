/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Config, ParsedSchedule } from '../../../types';

export function getInterval(config: Config, schedule: ParsedSchedule) {
  return schedule.interval ?? config.indexing.interval;
}
