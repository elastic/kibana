/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { Schedule as RuleSchedule } from '@kbn/response-ops-scheduling-types';
import type { backfillSchema, backfillScheduleSchema } from '../schemas';

export type BackfillSchedule = TypeOf<typeof backfillScheduleSchema>;
type BackfillSchemaType = TypeOf<typeof backfillSchema>;

export type Backfill = Omit<BackfillSchemaType, 'spaceId' | 'rule'> & {
  spaceId: SpaceId;
  // Same as the raw rule, the snapshotted schedule is exposed as the scheduling-types union
  // rather than the config-schema shape, which makes the rrule fields impossible to write.
  rule: Omit<BackfillSchemaType['rule'], 'schedule'> & { schedule: RuleSchedule };
};
