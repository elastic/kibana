/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import {
  boundedString,
  packQueryRecordRt,
  resultTypeRt,
  rruleScheduleConfigRt,
} from './shared_schemas';

export const createPackRequestBodySchema = t.intersection([
  t.type({
    name: t.string,
    queries: packQueryRecordRt,
  }),
  t.partial({
    description: t.string,
    enabled: t.boolean,
    policy_ids: t.array(t.string),
    shards: t.record(t.string, toNumberRt),
    schedule_type: t.union([t.literal('interval'), t.literal('rrule')]),
    interval: toNumberRt,
    rrule_schedule: rruleScheduleConfigRt,
    // V5: pack-level execution defaults
    min_osquery_version: boundedString(64),
    result_type: resultTypeRt,
    platform: boundedString(256),
  }),
]);

export type CreatePackRequestBodySchema = t.OutputOf<typeof createPackRequestBodySchema>;
