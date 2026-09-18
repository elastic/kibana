/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import type { Condition } from '@kbn/streamlang';
import { isFilterCondition } from '@kbn/streamlang';
import type { ExtractionMode } from './entity_schema';

/**
 * Strict complement of a priority gate, so every log is handled by exactly one process.
 *
 * The explicit `exists` arm is required: on a document missing the gated field, negating the gate
 * evaluates to null rather than true under ESQL three-valued logic, which would leave that document
 * unscanned by both processes.
 *
 * Restricted to a single-field condition because that is the only shape whose null case is
 * knowable from the gate alone. A composite gate spans several fields, each with its own null
 * behaviour, so it has to state its complement explicitly rather than have one inferred here.
 */
const complementOf = (gate: Condition): Condition => {
  assert(
    isFilterCondition(gate),
    'A priority extraction gate must be a single-field condition, so its complement can cover the null case'
  );
  assert(
    (gate as { exists?: unknown }).exists !== false,
    'A priority extraction gate cannot use exists: false — it matches missing-field documents, and its complement would too, creating overlap between the two processes'
  );

  return { or: [{ field: gate.field, exists: false }, { not: gate }] };
};

/**
 * Resolves the gate the given extraction mode scans with: the declared gate for 'priority', its
 * complement for 'nonPriority'. 'single' scans ungated, so a type with no dual-process support
 * renders the clause it always has.
 */
export const resolveExtractionGate = (
  priorityExtractionGate: Condition | undefined,
  extractionMode: ExtractionMode
): Condition | undefined => {
  if (!priorityExtractionGate || extractionMode === 'single') return undefined;

  return extractionMode === 'priority'
    ? priorityExtractionGate
    : complementOf(priorityExtractionGate);
};
