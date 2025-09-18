/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { autoFillSchedulerLogsQuerySchemaV1, autoFillSchedulerLogsResponseSchemaV1 } from '..';

export type GapAutoFillSchedulerLogsQuery = TypeOf<typeof autoFillSchedulerLogsQuerySchemaV1>;
export type GapAutoFillSchedulerLogsResponseBody = TypeOf<
  typeof autoFillSchedulerLogsResponseSchemaV1
>;

export interface GapAutoFillSchedulerLogsResponse {
  body: GapAutoFillSchedulerLogsResponseBody;
}
