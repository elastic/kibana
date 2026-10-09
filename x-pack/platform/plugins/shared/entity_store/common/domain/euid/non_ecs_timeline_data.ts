/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getEuidFromObject, getEntityIdentifiersFromDocument } from './memory';

/**
 * Structural match for timeline non-ECS rows (e.g. `TimelineNonEcsData` from
 * `@kbn/timelines-plugin/common`) so this module stays free of timelines imports.
 */
export interface NonEcsTimelineDataRow {
  readonly field: string;
  readonly value?: readonly (string | null | undefined)[] | null;
}

function firstNonEmptyValue(
  values: readonly (string | null | undefined)[] | null | undefined
): string | undefined {
  if (!values || values == null) {
    return undefined;
  }
  for (const v of values) {
    if (v != null && v !== '') {
      return String(v);
    }
  }
  return undefined;
}

/**
 * Turns a timeline `data` array into a flattened document: each `field` becomes a
 * top-level key (including dotted ECS paths like `host.name`). First non-empty
 * value wins when the same field appears more than once (matches merged timeline
 * rows where leading entries are authoritative).
 */
export function nonEcsTimelineDataToDocument(
  rows: readonly NonEcsTimelineDataRow[] = []
): Record<string, string> {
  if (rows.length === 0) {
    return {};
  }
  const doc: Record<string, string> = {};
  for (const row of rows) {
    const { field } = row;
    if (!field || Object.prototype.hasOwnProperty.call(doc, field)) {
      continue;
    }
    const scalar = firstNonEmptyValue(row.value);
    if (scalar !== undefined) {
      doc[field] = scalar;
    }
  }
  return doc;
}

export function getEuidFromTimelineNonEcsData(
  entityType: EntityType,
  rows: readonly NonEcsTimelineDataRow[] | undefined
): string | undefined {
  const doc = nonEcsTimelineDataToDocument(rows ?? []);
  if (Object.keys(doc).length === 0) {
    return undefined;
  }
  return getEuidFromObject(entityType, doc);
}

export function getEntityIdentifiersFromTimelineNonEcsData(
  entityType: EntityType,
  rows: readonly NonEcsTimelineDataRow[] | undefined
): Record<string, string> | undefined {
  const doc = nonEcsTimelineDataToDocument(rows ?? []);
  if (Object.keys(doc).length === 0) {
    return undefined;
  }
  return getEntityIdentifiersFromDocument(entityType, doc);
}
