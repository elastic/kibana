/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsMultiTermLookup,
  AggregationsMultiTermsAggregate,
  AggregationsStringTermsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { ConversationCountGroup, ConversationCountOptions } from '@kbn/agent-builder-common';
import {
  createBadRequestError,
  CONVERSATION_COUNT_DEFAULT_GROUP_SIZE,
  CONVERSATION_COUNT_MAX_GROUP_SIZE,
  CONVERSATION_SEARCH_FILTER_FIELDS,
  CONVERSATION_SEARCH_METADATA_FIELD_PREFIX,
} from '@kbn/agent-builder-common';
import { resolveFilterField } from './field_registry';

/** Name of the bucket aggregation a conversation count sends to Elasticsearch. */
export const CONVERSATION_COUNT_AGGREGATION_NAME = 'groups';

const ALLOWED_FIELDS_MESSAGE = `Allowed fields: ${CONVERSATION_SEARCH_FILTER_FIELDS.join(
  ', '
)}, ${CONVERSATION_SEARCH_METADATA_FIELD_PREFIX}.<key>`;

/**
 * The compiled `groupBy` of a conversation count: the aggregation to send, and the field names
 * (as the caller wrote them) in bucket key order.
 */
export interface ConversationCountAggregation {
  aggs: Record<string, AggregationsAggregationContainer>;
  fields: string[];
}

/** The aggregation shape Elasticsearch returns for {@link ConversationCountAggregation}. */
export type ConversationCountEsAggregations = Partial<
  Record<
    typeof CONVERSATION_COUNT_AGGREGATION_NAME,
    AggregationsStringTermsAggregate | AggregationsMultiTermsAggregate
  >
>;

const resolveGroupByField = (apiFieldName: string): string => {
  const resolved = resolveFilterField(apiFieldName);

  if (!resolved) {
    throw createBadRequestError(
      `Invalid group by field "${apiFieldName}". ${ALLOWED_FIELDS_MESSAGE}`
    );
  }

  if (resolved.nestedPath) {
    throw createBadRequestError(
      `Group by field "${apiFieldName}" is not supported; it is a nested field, so one conversation would fall into several buckets.`
    );
  }

  if (resolved.esType === 'date') {
    throw createBadRequestError(
      `Group by field "${apiFieldName}" is not supported; it is a date field, so every conversation would form its own bucket.`
    );
  }

  return resolved.path;
};

const resolveSize = (size: number | undefined): number => {
  if (size === undefined) {
    return CONVERSATION_COUNT_DEFAULT_GROUP_SIZE;
  }

  if (!Number.isInteger(size) || size < 1 || size > CONVERSATION_COUNT_MAX_GROUP_SIZE) {
    throw createBadRequestError(
      `Group size must be an integer between 1 and ${CONVERSATION_COUNT_MAX_GROUP_SIZE}.`
    );
  }

  return size;
};

const resolveMissing = (
  missing: ConversationCountOptions['missing'],
  fields: string[]
): Map<string, string> => {
  const resolved = new Map<string, string>();

  for (const [field, value] of Object.entries(missing ?? {})) {
    if (!fields.includes(field)) {
      throw createBadRequestError(
        `Missing value for "${field}" does not apply: it is not one of the group by fields.`
      );
    }
    if (typeof value !== 'string') {
      throw createBadRequestError(`Missing value for "${field}" must be a string.`);
    }
    resolved.set(field, value);
  }

  return resolved;
};

/**
 * Compiles the `groupBy`, `missing`, and `size` of a conversation count into a bucket
 * aggregation over the conversation index.
 *
 * @returns The aggregation and its field order, or `undefined` when `groupBy` is not set.
 * @throws A bad request error when a field is unknown, nested, or a date, when the same field is
 *   given twice, when `missing` names a field outside `groupBy`, or when `size` is out of bounds.
 */
export const buildCountAggregation = ({
  groupBy,
  missing,
  size,
}: Pick<ConversationCountOptions, 'groupBy' | 'missing' | 'size'>):
  | ConversationCountAggregation
  | undefined => {
  const bucketSize = resolveSize(size);

  if (groupBy === undefined) {
    return undefined;
  }

  const fields: string[] = Array.isArray(groupBy) ? [...groupBy] : [groupBy];

  if (fields.length < 1 || fields.length > 2) {
    throw createBadRequestError('Group by accepts 1 or 2 fields.');
  }

  if (new Set(fields).size !== fields.length) {
    throw createBadRequestError('Group by fields must be distinct.');
  }

  const paths = fields.map(resolveGroupByField);
  const missingByField = resolveMissing(missing, fields);

  const terms: AggregationsMultiTermLookup[] = fields.map((field, index) => ({
    field: paths[index],
    ...(missingByField.has(field) ? { missing: missingByField.get(field) } : {}),
  }));

  const aggregation: AggregationsAggregationContainer =
    terms.length === 1
      ? { terms: { ...terms[0], size: bucketSize } }
      : { multi_terms: { terms, size: bucketSize } };

  return {
    aggs: { [CONVERSATION_COUNT_AGGREGATION_NAME]: aggregation },
    fields,
  };
};

/**
 * Maps the buckets Elasticsearch returned for {@link buildCountAggregation} back to groups keyed
 * by the caller's field names.
 *
 * @param aggregations - The `aggregations` section of the search response.
 * @param fields - Field order from {@link ConversationCountAggregation}.
 * @returns Groups in the order Elasticsearch returned them (descending count).
 */
export const parseCountGroups = (
  aggregations: ConversationCountEsAggregations | undefined,
  fields: string[]
): ConversationCountGroup[] => {
  const buckets = aggregations?.[CONVERSATION_COUNT_AGGREGATION_NAME]?.buckets;

  if (!Array.isArray(buckets)) {
    return [];
  }

  return buckets.map(({ key, doc_count: count }) => {
    const values = Array.isArray(key) ? key : [key];

    return {
      key: Object.fromEntries(fields.map((field, index) => [field, String(values[index])])),
      count,
    };
  });
};
