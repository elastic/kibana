/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

const criteriaFieldSchema = schema.object({
  fieldType: schema.maybe(schema.string()),
  fieldName: schema.string(),
  fieldValue: schema.any(),
});

export const anomaliesTableDataSchema = {
  jobIds: schema.arrayOf(schema.string()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  influencers: schema.arrayOf(schema.maybe(schema.string())),
  aggregationInterval: schema.string(),
  threshold: schema.number(),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  dateFormatTz: schema.string(),
  maxRecords: schema.number(),
  maxExamples: schema.maybe(schema.number()),
  influencersFilterQuery: schema.maybe(schema.any()),
};

export const partitionFieldValuesSchema = {
  jobId: schema.string(),
  searchTerm: schema.maybe(schema.any()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  earliestMs: schema.number(),
  latestMs: schema.number(),
};
