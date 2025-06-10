/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
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

const bulkPurgePolicy = t.union([fixedAgePurge, fixedTimePurge]);

const bulkPurgeRollupSchema = t.type({
  body: t.intersection([
    t.type({
      list: t.array(t.string),
      purgePolicy: bulkPurgePolicy,
    }),
    t.partial({
      force: t.boolean,
    }),
  ]),
});

interface BulkPurgeRollupResponse {
  taskId?: DeleteByQueryResponse['task'];
}

type BulkPurgePolicyType = t.TypeOf<typeof bulkPurgePolicy>;
type BulkPurgeRollupInput = t.OutputOf<typeof bulkPurgeRollupSchema.props.body>; // Raw payload sent by the frontend
type BulkPurgeRollupParams = t.TypeOf<typeof bulkPurgeRollupSchema.props.body>;

export type {
  BulkPurgeRollupResponse,
  BulkPurgePolicyType,
  BulkPurgeRollupInput,
  BulkPurgeRollupParams,
};
export { bulkPurgeRollupSchema };
