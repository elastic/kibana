/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';

const DURATION_RE = /^(\d+)(ms|s|m|h|d|w)$/;

const DURATION_UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseDurationToMs(value: string): number {
  const match = DURATION_RE.exec(value);
  if (!match) return NaN;
  return parseInt(match[1], 10) * DURATION_UNIT_TO_MS[match[2]];
}

/**
 * Validate a duration string format (e.g., "5m", "1h", "30s", "250ms")
 * @returns Error message if invalid, undefined if valid
 */
export function validateDuration(value: string): string | void {
  if (!DURATION_RE.test(value)) {
    return `Invalid duration "${value}". Expected format like "5m", "1h", "30s", "250ms"`;
  }
}

/**
 * Validate that a duration string does not exceed a maximum duration.
 * Both values must be valid duration strings.
 * @returns Error message if exceeded, undefined if valid
 */
export function validateMaxDuration(value: string, max: string): string | void {
  const valueMs = parseDurationToMs(value);
  const maxMs = parseDurationToMs(max);
  if (!isNaN(valueMs) && !isNaN(maxMs) && valueMs > maxMs) {
    return `Duration "${value}" exceeds the maximum allowed value of "${max}"`;
  }
}

/**
 * Validate that a duration string is not below a minimum duration.
 * Both values must be valid duration strings.
 * @returns Error message if below minimum, undefined if valid
 */
export function validateMinDuration(value: string, min: string): string | void {
  const valueMs = parseDurationToMs(value);
  const minMs = parseDurationToMs(min);
  if (!isNaN(valueMs) && !isNaN(minMs) && valueMs < minMs) {
    return `Duration "${value}" is below the minimum allowed value of "${min}"`;
  }
}

/**
 * Validate an ES|QL query string
 * @returns Error message if invalid, undefined if valid
 */
export function validateEsqlQuery(query: string): string | void {
  const errors = Parser.parseErrors(query);
  if (errors.length > 0) {
    return `Invalid ES|QL query: ${errors[0].message}`;
  }
}

/**
 * Compose a base ES|QL query with an appendable segment to avoid fragile
 * string concatenation. The segment is typically a bare command (e.g.
 * `WHERE x > 0`); a leading pipe is tolerated and stripped so the pipe is
 * always supplied internally.
 */
export function composeEsqlQuery(base: string, segment: string): string {
  const normalizedSegment = segment.replace(/^\s*\|\s*/, '');
  const { root: baseRoot } = Parser.parse(base);
  const { root: segmentRoot } = Parser.parse('FROM _\n| ' + normalizedSegment);
  // drop the "FROM _" from the validated block command
  const segmentCommands = segmentRoot.commands.slice(1);
  const composedRoot = {
    ...baseRoot,
    commands: [...baseRoot.commands, ...segmentCommands],
  };
  return BasicPrettyPrinter.query(composedRoot);
}

export interface DataFieldIssue {
  code: 'custom';
  path: (string | number)[];
  message: string;
  input: unknown;
  [key: string]: unknown;
}

export interface ValidateDataRecordFieldsOptions {
  data: Record<string, unknown>;
  maxFields: number;
  fieldSizeLimit: number;
  /** Label prefix for messages, e.g. "Source data" or "Artifact data" */
  label: string;
  /** Optional suffix appended to per-field size messages, e.g. ' for type "runbook"' */
  fieldMessageSuffix?: string;
  /** Fields validated separately by a type-specific schema — skipped by generic size checks */
  declaredFields?: ReadonlySet<string>;
}

/**
 * Validates field count and per-field size for a `data` record used in
 * `{ type, data }` envelopes (artifacts, source). Returns issues rather than
 * throwing so callers can push them into a Zod `.check()` context.
 */
export function validateDataRecordFields({
  data,
  maxFields,
  fieldSizeLimit,
  label,
  fieldMessageSuffix = '',
  declaredFields,
}: ValidateDataRecordFieldsOptions): DataFieldIssue[] {
  const issues: DataFieldIssue[] = [];
  const fields = Object.entries(data);

  if (fields.length > maxFields) {
    issues.push({
      code: 'custom',
      path: ['data'],
      message: `${label} must have at most ${maxFields} fields.`,
      input: data,
    });
  }

  for (const [field, value] of fields) {
    if (declaredFields?.has(field)) {
      continue;
    }

    if (typeof value === 'string') {
      if (value.length > fieldSizeLimit) {
        issues.push({
          code: 'custom',
          path: ['data', field],
          message: `${label} field "${field}" must be at most ${fieldSizeLimit} characters${fieldMessageSuffix}.`,
          input: value,
        });
      }
      continue;
    }

    if ((JSON.stringify(value) ?? '').length > fieldSizeLimit) {
      issues.push({
        code: 'custom',
        path: ['data', field],
        message: `${label} field "${field}" must serialize to at most ${fieldSizeLimit} characters${fieldMessageSuffix}.`,
        input: value,
      });
    }
  }

  return issues;
}
