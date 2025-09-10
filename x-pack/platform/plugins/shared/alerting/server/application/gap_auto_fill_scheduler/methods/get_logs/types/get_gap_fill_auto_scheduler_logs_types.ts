/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { IValidatedEventInternalDocInfo } from '@kbn/event-log-plugin/server';
import type { getGapFillAutoSchedulerLogsSchema } from '../schemas';

export type GetGapFillAutoSchedulerLogsParams = TypeOf<typeof getGapFillAutoSchedulerLogsSchema>;

export interface GapFillAutoSchedulerLogsResult {
  data: IValidatedEventInternalDocInfo[];
  total: number;
  page: number;
  perPage: number;
}
