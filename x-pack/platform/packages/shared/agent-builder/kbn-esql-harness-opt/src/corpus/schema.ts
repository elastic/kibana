/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';

export interface IndexSchema {
  index: string;
  keywordFields: string[];
  numericFields: string[];
  dateFields: string[];
  textFields: string[];
  ipFields: string[];
  /** Up to five non-null values per keyword field, sampled from the data itself. */
  sampleValues: Record<string, string[]>;
  /** Approximate median per numeric field, used for range filters that match something. */
  medians: Record<string, number>;
}

const IDENTIFIER_FIELD = /(^|\.)(id|code|port|version|emp_no|_id|_no)$/i;

const NUMERIC_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
]);

/**
 * Read the live mapping of an index and sample literals out of the data.
 *
 * Templates are instantiated from this rather than from a model's idea of the schema: the point
 * of query-first synthesis is that the gold query is an executed fact, not an opinion.
 */
export const describeIndex = async ({
  esClient,
  index,
}: {
  esClient: EsClient;
  index: string;
}): Promise<IndexSchema> => {
  const fieldCaps = await esClient.fieldCaps({ index, fields: '*' });

  const schema: IndexSchema = {
    index,
    keywordFields: [],
    numericFields: [],
    dateFields: [],
    textFields: [],
    ipFields: [],
    sampleValues: {},
    medians: {},
  };

  for (const [field, caps] of Object.entries(fieldCaps.fields)) {
    if (field.startsWith('_')) continue;
    const types = Object.keys(caps);
    const [type] = types;
    if (types.length !== 1) continue;
    if (type === 'keyword') schema.keywordFields.push(field);
    // Identifier-shaped numbers (ports, codes, ids) aggregate fine but produce questions nobody
    // would ask ("average event code per host"), so they are not template material.
    else if (NUMERIC_TYPES.has(type) && !IDENTIFIER_FIELD.test(field))
      schema.numericFields.push(field);
    else if (type === 'date') schema.dateFields.push(field);
    else if (type === 'text') schema.textFields.push(field);
    else if (type === 'ip') schema.ipFields.push(field);
  }

  for (const field of schema.keywordFields.slice(0, 12)) {
    try {
      const response = (await esClient.esql.query({
        query: `FROM ${index} | WHERE ${field} IS NOT NULL | STATS c = COUNT(*) BY ${field} | SORT c DESC | LIMIT 5`,
      })) as { values?: unknown[][] };
      schema.sampleValues[field] = (response.values ?? [])
        .map((row) => row[1])
        .filter((value): value is string => typeof value === 'string');
    } catch (e) {
      schema.sampleValues[field] = [];
    }
  }

  for (const field of schema.numericFields.slice(0, 12)) {
    try {
      const response = (await esClient.esql.query({
        query: `FROM ${index} | STATS p = MEDIAN(${field})`,
      })) as { values?: unknown[][] };
      const median = response.values?.[0]?.[0];
      if (typeof median === 'number' && Number.isFinite(median)) {
        schema.medians[field] = Math.round(median * 100) / 100;
      }
    } catch (e) {
      // a field that cannot be aggregated simply does not get range templates
    }
  }

  return schema;
};
