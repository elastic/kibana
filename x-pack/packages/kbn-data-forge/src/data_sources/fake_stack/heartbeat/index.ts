/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeneratorFunction } from '../../../types';
import { bad } from './lib/events/bad';
import { good } from './lib/events/good';

export const kibanaAssets = `${__dirname}/assets/heartbeat.ndjson`;

export const generateEvent: GeneratorFunction = (_config, schedule, _index, timestamp) => {
  return schedule.template === 'bad' ? bad(schedule, timestamp) : good(schedule, timestamp);
};
