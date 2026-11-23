/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import {
  MAX_MAINTENANCE_REASON_LENGTH,
  maintenanceChangeSetSchema,
  maintenanceContradictionSchema,
  maintenanceMergeSchema,
  maintenanceRelationshipRemovalSchema,
  maintenanceRewriteSchema,
  maintenanceSummarySchema,
  type MaintenanceChangeSet,
} from '../../common/step_types/apply_maintenance_changes';

const OPTIONAL_TEXT_FIELDS = ['title', 'description', 'content'] as const;

export type ParsedMaintenanceChanges =
  | { changeSet: MaintenanceChangeSet; rejected: Array<{ item: string; reason: string }> }
  | { error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Drops empty text and cuts a long reason, as models sometimes return them. */
const tidy = (change: unknown): unknown => {
  if (!isRecord(change)) {
    return change;
  }
  const tidied = { ...change };
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (tidied[field] === '') {
      delete tidied[field];
    }
  }
  if (typeof tidied.reason === 'string') {
    tidied.reason = tidied.reason.slice(0, MAX_MAINTENANCE_REASON_LENGTH);
  }
  return tidied;
};

/**
 * Parses the changes the model returned for a batch, one change at a time, so that one incomplete
 * change is rejected on its own rather than failing the run.
 */
export const parseMaintenanceChanges = (input: unknown): ParsedMaintenanceChanges => {
  if (input !== undefined && !isRecord(input)) {
    return { error: 'the changes are not an object' };
  }
  const raw = input ?? {};
  const rejected: Array<{ item: string; reason: string }> = [];
  const listOf = <T>(key: keyof MaintenanceChangeSet, label: string, schema: z.ZodType<T>): T[] => {
    const entries = raw[key];
    if (entries === undefined || entries === null) {
      return [];
    }
    if (!Array.isArray(entries)) {
      rejected.push({ item: key, reason: 'the model returned it as something other than a list' });
      return [];
    }
    return entries.flatMap((entry, index) => {
      const parsed = schema.safeParse(tidy(entry));
      if (parsed.success) {
        return [parsed.data];
      }
      const [issue] = parsed.error.issues;
      rejected.push({
        item: `${label} ${index + 1}`,
        reason: `the model returned it incomplete: ${[
          ...issue.path.map(String),
          issue.message,
        ].join(': ')}`,
      });
      return [];
    });
  };
  const parsed = maintenanceChangeSetSchema.safeParse({
    merges: listOf('merges', 'merge', maintenanceMergeSchema),
    contradictions: listOf('contradictions', 'contradiction', maintenanceContradictionSchema),
    rewrites: listOf('rewrites', 'rewrite', maintenanceRewriteSchema),
    summaries: listOf('summaries', 'summary', maintenanceSummarySchema),
    relationships: listOf(
      'relationships',
      'relationship removal',
      maintenanceRelationshipRemovalSchema
    ),
  });
  return parsed.success ? { changeSet: parsed.data, rejected } : { error: parsed.error.message };
};
