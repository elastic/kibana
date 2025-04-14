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

const bulkPurgeRollupSchema = t.type({
  query: t.partial({
    force: t.string,
  }),
  body: t.type({
    ids: t.array(t.string),
    purgePolicy: t.union([fixedAgePurge, fixedTimePurge]),
  }),
});

export { bulkPurgeRollupSchema };
