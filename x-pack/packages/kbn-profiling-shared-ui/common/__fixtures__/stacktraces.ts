/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StackTraceResponse } from '@kbn/profiling-data-access-plugin/common/stack_traces';

import stackTraces1x from './stacktraces_60s_1x.json';
import stackTraces5x from './stacktraces_3600s_5x.json';
import stackTraces125x from './stacktraces_86400s_125x.json';
import stackTraces625x from './stacktraces_604800s_625x.json';

export const stackTraceFixtures: Array<{
  response: StackTraceResponse;
  seconds: number;
  upsampledBy: number;
}> = [
  { response: stackTraces1x, seconds: 60, upsampledBy: 1 },
  { response: stackTraces5x, seconds: 3600, upsampledBy: 5 },
  { response: stackTraces125x, seconds: 86400, upsampledBy: 125 },
  { response: stackTraces625x, seconds: 604800, upsampledBy: 625 },
];
