/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';

const scheduleTypeRt = t.union([t.literal('interval'), t.literal('rrule')]);

const rruleScheduleConfigRt = t.intersection([
  t.type({
    rrule: t.string,
    start_date: t.string,
  }),
  t.partial({
    end_date: t.string,
    splay: t.string,
    timeout: t.number,
  }),
]);

export const updatePacksRequestBodySchema = t.type({
  name: t.union([t.string, t.undefined]),
  description: t.union([t.string, t.undefined]),
  enabled: t.union([t.boolean, t.undefined]),
  policy_ids: t.union([t.array(t.string), t.undefined]),
  shards: t.union([t.record(t.string, toNumberRt), t.undefined]),
  schedule_type: t.union([scheduleTypeRt, t.undefined]),
  interval: t.union([toNumberRt, t.undefined]),
  rrule_schedule: t.union([rruleScheduleConfigRt, t.undefined]),
  queries: t.union([
    t.record(
      t.string,
      t.type({
        query: t.string,
        interval: t.union([toNumberRt, t.undefined]),
        snapshot: t.union([t.boolean, t.undefined]),
        removed: t.union([t.boolean, t.undefined]),
        platform: t.union([t.string, t.undefined]),
        version: t.union([t.string, t.undefined]),
        schedule_type: t.union([scheduleTypeRt, t.undefined]),
        rrule_schedule: t.union([rruleScheduleConfigRt, t.undefined]),
        ecs_mapping: t.union([
          t.record(
            t.string,
            t.type({
              field: t.union([t.string, t.undefined]),
              value: t.union([t.string, t.array(t.string), t.undefined]),
            })
          ),
          t.undefined,
        ]),
      })
    ),
    t.undefined,
  ]),
});

export type UpdatePacksRequestBodySchema = t.OutputOf<typeof updatePacksRequestBodySchema>;

export const updatePacksRequestParamsSchema = t.type({
  id: t.string,
});

export type UpdatePacksRequestParamsSchema = t.OutputOf<typeof updatePacksRequestParamsSchema>;
