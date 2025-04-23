/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { snoozeBodyInternalSchemaV1 } from '../../../../../../../../common/routes/rule/apis/snooze';

type SnoozeBodyInternalSchema = TypeOf<typeof snoozeBodyInternalSchemaV1>;

export const transformSnoozeBody: (opts: SnoozeBodyInternalSchema) => {
  snoozeSchedule: SnoozeBodyInternalSchema['snooze_schedule'];
} = ({ snooze_schedule: snoozeSchedule }) => ({
  snoozeSchedule,
});
