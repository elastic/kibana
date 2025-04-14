/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { dateType, durationType } from '../../schema';

const fixedAgePurgeVal = t.literal('fixed_age');
const fixedTimePurgeVal = t.literal('fixed_time');

const fixedAgePurge = t.type({
  purgeType: fixedAgePurgeVal,
  age: durationType,
});

const fixedTimePurge = t.type({
  purgeType: fixedTimePurgeVal,
  timestamp: dateType,
});

const purgePolicy = t.union([fixedAgePurge, fixedTimePurge]);

const bulkPurgeRollupSchema = t.intersection([
  t.partial({
    query: t.partial({
      force: t.string,
    }),
  }),
  t.type({
    body: t.type({
      ids: t.array(t.string),
      purgePolicy,
    }),
  }),
]);

type PurgePolicyType = t.TypeOf<typeof purgePolicy>;
type PurgeSLIInput = t.OutputOf<(typeof bulkPurgeRollupSchema.types)[1]>; // Raw payload sent by the frontend

export type { PurgePolicyType, PurgeSLIInput };
export { bulkPurgeRollupSchema };
