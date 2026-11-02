/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { getFlattenedObject } from '@kbn/std';
import { isEmpty, isEqual } from 'lodash';

export interface InferenceDocument {
  _id?: string;
  fields: Record<string, unknown>;
}

export interface InferenceDocumentLimits {
  maxDocumentBytes: number;
  maxFields: number;
  maxFieldNameLength: number;
  maxStringLength: number;
  maxArrayItems: number;
  maxTagItems: number;
  maxNestedObjectEntries: number;
  maxNestedDepth: number;
}

export const DEFAULT_INFERENCE_DOCUMENT_LIMITS: InferenceDocumentLimits = {
  maxDocumentBytes: 32 * 1024,
  maxFields: 100,
  maxFieldNameLength: 1024,
  maxStringLength: 8 * 1024,
  maxArrayItems: 3,
  maxTagItems: 20,
  maxNestedObjectEntries: 20,
  maxNestedDepth: 5,
};

const OTEL_FIELD_PREFIX = /^(?:resource\.)?attributes\./;

const DUPLICATE_FIELD_GROUPS = new Map([
  ['message', 'log_body'],
  ['body.text', 'log_body'],
  ['error.stack_trace', 'stack_trace'],
  ['exception.stacktrace', 'stack_trace'],
]);

const isTagField = (key: string): boolean => key.includes('tags');

const getSerializedByteLength = (value: unknown): number =>
  Buffer.byteLength(JSON.stringify(value), 'utf8');

const getDuplicateFieldGroup = (key: string): string | undefined =>
  DUPLICATE_FIELD_GROUPS.get(key.replace(OTEL_FIELD_PREFIX, ''));

const truncateValue = (
  value: unknown,
  key: string,
  limits: InferenceDocumentLimits,
  depth: number
): unknown => {
  if (typeof value === 'string') {
    return value.length > limits.maxStringLength
      ? `${value.slice(0, limits.maxStringLength)}…`
      : value;
  }

  if (Array.isArray(value)) {
    const maxItems = isTagField(key) ? limits.maxTagItems : limits.maxArrayItems;
    const items = value
      .slice(0, maxItems)
      .map((item) => truncateValue(item, key, limits, depth + 1));
    if (value.length > maxItems) {
      items.push(`+${value.length - maxItems} more`);
    }
    return items;
  }

  if (value && typeof value === 'object') {
    if (depth >= limits.maxNestedDepth) {
      return '[nested value omitted]';
    }
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, limits.maxNestedObjectEntries)
        .map(([nestedKey, nestedValue]) => [
          nestedKey,
          truncateValue(nestedValue, nestedKey, limits, depth + 1),
        ])
    );
  }

  return value;
};

const orderFieldsByPriority = (
  entries: Array<[string, unknown]>,
  priorityFields: readonly string[]
): Array<[string, unknown]> => {
  if (priorityFields.length === 0) {
    return entries;
  }
  const rankOf = (key: string): number => {
    const direct = priorityFields.indexOf(key);
    if (direct !== -1) {
      return direct;
    }
    const normalized = priorityFields.indexOf(key.replace(OTEL_FIELD_PREFIX, ''));
    return normalized === -1 ? Number.MAX_SAFE_INTEGER : normalized;
  };
  return entries
    .map((entry, index) => ({ entry, index, rank: rankOf(entry[0]) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ entry }) => entry);
};

/** Flattens and bounds a raw search hit into a compact document for LLM inference. */
export function formatRawDocument({
  hit,
  priorityFields = [],
  limits: limitsOverride,
}: {
  hit: SearchHit<Record<string, unknown>>;
  priorityFields?: readonly string[];
  limits?: Partial<InferenceDocumentLimits>;
}): InferenceDocument | undefined {
  const limits: InferenceDocumentLimits = {
    ...DEFAULT_INFERENCE_DOCUMENT_LIMITS,
    ...limitsOverride,
  };

  const rawFields: Record<string, unknown> = {
    ...(hit.fields ?? {}),
    ...getFlattenedObject(hit._source ?? {}),
  };
  if (isEmpty(rawFields)) {
    return undefined;
  }

  const orderedEntries = orderFieldsByPriority(Object.entries(rawFields), priorityFields);

  const document: InferenceDocument = { _id: hit._id, fields: {} };
  const retainedGroupedValues = new Map<string, unknown[]>();
  for (const [key, rawValue] of orderedEntries) {
    if (Object.keys(document.fields).length >= limits.maxFields) {
      break;
    }
    if (key.length > limits.maxFieldNameLength) {
      continue;
    }
    const unwrapped = Array.isArray(rawValue) && rawValue.length === 1 ? rawValue[0] : rawValue;
    const duplicateFieldGroup = getDuplicateFieldGroup(key);
    if (
      duplicateFieldGroup &&
      retainedGroupedValues.get(duplicateFieldGroup)?.some((value) => isEqual(value, unwrapped))
    ) {
      continue;
    }
    const candidateFields = {
      ...document.fields,
      [key]: truncateValue(unwrapped, key, limits, 0),
    };
    if (
      getSerializedByteLength({ ...document, fields: candidateFields }) <= limits.maxDocumentBytes
    ) {
      document.fields = candidateFields;
      if (duplicateFieldGroup) {
        retainedGroupedValues.set(duplicateFieldGroup, [
          ...(retainedGroupedValues.get(duplicateFieldGroup) ?? []),
          unwrapped,
        ]);
      }
    }
  }

  return Object.keys(document.fields).length > 0 ? document : undefined;
}
