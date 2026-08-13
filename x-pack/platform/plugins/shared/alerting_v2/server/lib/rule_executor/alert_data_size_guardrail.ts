/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Serialized size of `null`, also used for non-finite numbers. */
const NULL_BYTES = 4;

/**
 * Walks `value` and subtracts an estimate of its JSON-serialized byte size
 * from `budget`, bailing out as soon as the budget goes negative. The cost is
 * O(min(actual size, budget)): a pathologically large row costs no more than
 * the configured limit to reject, without ever serializing it.
 *
 * The estimate ignores JSON string escaping (`"`, `\`, control characters),
 * so it can slightly undercount; the guardrail is approximate by design.
 *
 * @returns the remaining budget; negative means `value` exceeds it.
 */
const consumeJsonSizeBudget = (value: unknown, budget: number): number => {
  if (budget < 0) {
    return budget;
  }

  if (value === null || value === undefined) {
    return budget - NULL_BYTES;
  }

  switch (typeof value) {
    case 'string':
      // UTF-8 byte length is never less than the UTF-16 code-unit count, so
      // a string longer than the budget cannot fit — skip the byte scan.
      if (value.length + 2 > budget) {
        return budget - (value.length + 2);
      }
      return budget - (Buffer.byteLength(value, 'utf8') + 2);
    case 'number':
      return budget - (Number.isFinite(value) ? String(value).length : NULL_BYTES);
    case 'boolean':
      return budget - (value ? 4 : 5);
    case 'object':
      break;
    default:
      // function / symbol are dropped by JSON.stringify; bigint cannot occur
      // here (coerced to number when the Arrow response is read).
      return budget;
  }

  if (Array.isArray(value)) {
    budget -= 2;
    for (let i = 0; i < value.length && budget >= 0; i++) {
      budget = consumeJsonSizeBudget(value[i], i > 0 ? budget - 1 : budget);
    }
    return budget;
  }

  budget -= 2;
  let first = true;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (budget < 0) {
      return budget;
    }
    if (entry === undefined) {
      continue;
    }
    budget -= Buffer.byteLength(key, 'utf8') + 3 + (first ? 0 : 1);
    budget = consumeJsonSizeBudget(entry, budget);
    first = false;
  }
  return budget;
};

/**
 * Whether `value`, once JSON-serialized, would exceed `maxBytes`.
 * Cost is bounded by `maxBytes`, not by the size of `value`.
 */
export const exceedsJsonSizeBudget = (value: unknown, maxBytes: number): boolean =>
  consumeJsonSizeBudget(value, maxBytes) < 0;

/**
 * Clips a string to at most `maxBytes` UTF-8 bytes without splitting a
 * multi-byte code point (a partial trailing sequence is dropped).
 */
const truncateStringToBytes = (value: string, maxBytes: number): string => {
  if (maxBytes <= 0) {
    return '';
  }
  // The first maxBytes UTF-16 units always cover any maxBytes-byte UTF-8
  // prefix, so working on this window keeps the cost bounded by maxBytes
  // even for pathologically large inputs.
  const window = value.length > maxBytes ? value.slice(0, maxBytes) : value;
  if (Buffer.byteLength(window, 'utf8') <= maxBytes) {
    return window;
  }

  let clipped = Buffer.from(window, 'utf8').subarray(0, maxBytes).toString('utf8');
  while (clipped.endsWith('�')) {
    clipped = clipped.slice(0, -1);
  }
  return clipped;
};

export interface EnforceAlertDataSizeParams {
  /** The ES|QL row destined for the event `data` payload. */
  rowDoc: Record<string, unknown>;
  /** The rule's grouping fields; preserved (clipped) when truncating. */
  groupingFields: string[];
  /** Maximum JSON-serialized size of the `data` payload, in bytes. */
  maxBytes: number;
}

export interface EnforceAlertDataSizeResult {
  data: Record<string, unknown>;
  truncated: boolean;
}

/**
 * Ensures an alert event `data` payload stays within `maxBytes` once
 * JSON-serialized.
 *
 * Rows within the budget pass through untouched. Oversized rows are replaced
 * by a minimal payload keeping only the rule's grouping fields — string
 * values clipped to fit, non-string values kept only when they fit whole —
 * so the episode stays identifiable while every other column is dropped.
 * Callers flag truncation on the event document's top-level `data_truncated`
 * field; nothing is written into `data` itself, so user-defined ES|QL
 * columns cannot collide with framework metadata.
 *
 * Must be called AFTER the group hash (and severity) are derived: those are
 * always computed from the full row, so truncation never affects episode
 * identity or deduplication.
 */
export const enforceAlertDataSize = ({
  rowDoc,
  groupingFields,
  maxBytes,
}: EnforceAlertDataSizeParams): EnforceAlertDataSizeResult => {
  if (!exceedsJsonSizeBudget(rowDoc, maxBytes)) {
    return { data: rowDoc, truncated: false };
  }

  const data: Record<string, unknown> = {};
  let remaining = maxBytes - 2;

  const presentFields = groupingFields.filter((field) => rowDoc[field] !== undefined);

  for (let i = 0; i < presentFields.length; i++) {
    const field = presentFields[i];
    const value = rowDoc[field];
    // Fair share of what is left; budget a field does not use rolls over.
    const share = Math.floor(remaining / (presentFields.length - i));
    const keyCost = Buffer.byteLength(field, 'utf8') + 4;
    const valueBudget = share - keyCost;

    if (valueBudget <= 0) {
      continue;
    }

    if (typeof value === 'string') {
      const clipped = truncateStringToBytes(value, valueBudget - 2);
      data[field] = clipped;
      remaining -= keyCost + Buffer.byteLength(clipped, 'utf8') + 2;
      continue;
    }

    // Non-string grouping values (numbers, booleans, multivalue columns) are
    // kept only when they fit whole; deep-truncating them would store
    // misleading partial values.
    const budgetLeftAfterValue = consumeJsonSizeBudget(value, valueBudget);
    if (budgetLeftAfterValue >= 0) {
      data[field] = value;
      remaining -= keyCost + (valueBudget - budgetLeftAfterValue);
    }
  }

  // Safety net: the estimator ignores JSON string escaping (`"`, `\`, control
  // chars), so grouping values heavy with those can push the actual serialized
  // size over the limit despite the budget-based clipping above. Drop fields
  // from the end until the true byte count is within the limit.
  const keys = Object.keys(data);
  while (keys.length > 0 && Buffer.byteLength(JSON.stringify(data), 'utf8') > maxBytes) {
    delete data[keys.pop()!];
  }

  return { data, truncated: true };
};
