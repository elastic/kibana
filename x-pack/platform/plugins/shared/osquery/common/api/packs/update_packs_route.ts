/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { packQueryRecordPartialRt, rruleScheduleConfigPartialRt } from './shared_schemas';

export const updatePacksRequestBodySchema = t.partial({
  name: t.string,
  description: t.string,
  enabled: t.boolean,
  policy_ids: t.array(t.string),
  shards: t.record(t.string, toNumberRt),
  queries: packQueryRecordPartialRt,
  schedule_type: t.union([t.literal('interval'), t.literal('rrule'), t.null]),
  interval: t.union([toNumberRt, t.null]),
  rrule_schedule: t.union([rruleScheduleConfigPartialRt, t.null]),
});

export type UpdatePacksRequestBodySchema = t.OutputOf<typeof updatePacksRequestBodySchema>;

export const updatePacksRequestParamsSchema = t.type({
  id: t.string,
});

export type UpdatePacksRequestParamsSchema = t.OutputOf<typeof updatePacksRequestParamsSchema>;
