/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type {
  CalculatedEntityIdentity,
  EntityDefinitionWithoutId,
  EuidAttribute,
  EuidField,
  EuidSeparator,
  FieldEvaluationSource,
  FieldValueSchema,
} from '../definitions/entity_schema';
import {
  getPostAggFilter,
  isSingleFieldIdentity,
  validateEntityDefinitionType,
} from '../definitions/entity_schema';

interface FieldValue {
  [key: string]: string;
}

/**
 * Assumes the document has previously been validated
 * to not be null or undefined.
 */
export function getDocument(doc: any): any {
  if (doc._source && typeof doc._source === 'object') {
    return doc._source;
  }
  return doc;
}

function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Compares two strings by Unicode code point, the order Elasticsearch sorts keywords in (UTF-8 byte
 * order). Plain `<` compares UTF-16 code units, which differs for characters outside the BMP.
 */
export function compareCodePoints(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) {
      // At the first differing unit, `codePointAt` yields the full code point, or the low surrogate
      // when the high surrogates match. Both order the same way as code points.
      return (a.codePointAt(i) ?? 0) < (b.codePointAt(i) ?? 0) ? -1 : 1;
    }
  }
  return a.length - b.length;
}

/**
 * All non-empty values of a field, in the order they appear. An empty string, null, or a nested
 * object or array is not a value.
 */
export function getFieldValues(doc: any, field: string): string[] {
  const flattenedValue = doc[field];
  const fieldInObject = isEmpty(flattenedValue) ? get(doc, field) : flattenedValue;
  const values = Array.isArray(fieldInObject) ? fieldInObject : [fieldInObject];
  return values
    .filter((value) => !isEmpty(value) && typeof value !== 'object')
    .map((value) => String(value));
}

/**
 * The value a field contributes to an entity id: its lowest non-empty value by code point, or
 * undefined when it has none. A multi-valued field is reduced the same way in ES|QL
 * (`esqlIdentityValue`) and Painless (`__euid_min`), so every path picks the same value.
 */
export function getFieldValue(doc: any, field: string): string | undefined {
  const flattenedValue = doc[field];
  const fieldInObject = isEmpty(flattenedValue) ? get(doc, field) : flattenedValue;

  if (isEmpty(fieldInObject)) {
    return undefined;
  }

  if (!Array.isArray(fieldInObject) && typeof fieldInObject === 'object') {
    throw new Error(
      `Field ${field} is an object, can't convert to value (value: ${JSON.stringify(
        fieldInObject
      )})`
    );
  }

  return getFieldValues(doc, field).reduce<string | undefined>(
    (lowest, value) =>
      lowest === undefined || compareCodePoints(value, lowest) < 0 ? value : lowest,
    undefined
  );
}

/**
 * The field's first value. `includes` reads it this way until #20578 changes it, and entity
 * records are filtered on it: a record collects values from several events, so its first value
 * is the one its EUID was built from, not the lowest.
 */
export function getFirstFieldValue(doc: any, field: string): string | undefined {
  const flattenedValue = doc[field];
  const fieldInObject = isEmpty(flattenedValue) ? get(doc, field) : flattenedValue;
  if (Array.isArray(fieldInObject)) {
    const [first] = fieldInObject;
    return first !== undefined && first !== null ? String(first) : undefined;
  }
  return getFieldValue(doc, field);
}

export function getCompositionFields(composition: EuidAttribute[]): string[] {
  return composition.filter(isEuidField).map((attr) => attr.field);
}

/**
 * Builds `documentsFilter` ∧ `postAggFilter` for DSL, ESQL, and single-doc gate evaluation.
 * Missing `documentsFilter` is treated as always true so a definition with only `postAggFilter` still applies.
 */
export function mergeDocumentsFilterAndPostAgg(
  documentsFilter?: Condition,
  postAggFilter?: Condition
): Condition {
  let condition: Condition = documentsFilter ?? { always: true };
  if (postAggFilter) {
    condition = { and: [condition, postAggFilter] };
  }
  return condition;
}

/**
 * Evaluates a streamlang condition against a document. Supports and, or, not, and field predicates.
 */
export function evaluateStreamlangCondition(doc: any, condition: unknown): boolean {
  if (!condition || typeof condition !== 'object') return false;
  const c = condition as Record<string, unknown>;
  if ('and' in c && Array.isArray(c.and)) {
    return (c.and as unknown[]).every((sub) => evaluateStreamlangCondition(doc, sub));
  }
  if ('or' in c && Array.isArray(c.or)) {
    return (c.or as unknown[]).some((sub) => evaluateStreamlangCondition(doc, sub));
  }
  if ('not' in c) {
    return !evaluateStreamlangCondition(doc, c.not);
  }
  if ('always' in c) return true;
  if ('never' in c) return false;
  if ('field' in c && typeof c.field === 'string') {
    const value = getFieldValue(doc, c.field);
    if ('eq' in c && c.eq !== undefined) return value === String(c.eq);
    if ('neq' in c && c.neq !== undefined) return value !== String(c.neq);
    if ('exists' in c) {
      const exists = value !== undefined && value !== null && value !== '';
      return c.exists === exists;
    }
    if ('includes' in c) {
      // Reads the first value, not the identity value: #20578 changes `includes` separately.
      const fieldVal = getFirstFieldValue(doc, c.field);
      if (fieldVal === undefined) return false;
      return String(fieldVal).includes(String(c.includes));
    }
  }
  return false;
}

export interface EuidGateOptions {
  /** Also gate on `postAggFilter`, the rule for putting an entity in the store. @default true */
  applyPostAggFilter?: boolean;
}

/** `ALERT_RULE_UUID` from `@kbn/rule-data-utils`. The flyout's ECS projection drops `kibana.alert.uuid` but keeps this. */
const ALERT_RULE_UUID_FIELD = 'kibana.alert.rule.uuid';

/** An alert never creates an entity: extraction reads log indices, not `.alerts-*`. */
const DOCUMENT_IS_ALERT: Condition = { field: ALERT_RULE_UUID_FIELD, exists: true };

/** ORs {@link DOCUMENT_IS_ALERT} in front of `postAggFilter` so alerts satisfy it. */
export function waiveForAlerts(postAggFilter?: Condition): Condition | undefined {
  if (!postAggFilter) {
    return undefined;
  }
  return { or: [DOCUMENT_IS_ALERT, postAggFilter] };
}

/**
 * True when the document matches `documentsFilter`, and `postAggFilter` too unless it is an alert.
 * `postAggFilter` uses logical field names; main extraction ESQL applies `recent.` only when
 * building the post-join WHERE.
 *
 * For single-field identity definitions, returns true (callers only use this on the
 * calculated-identity path after field evaluations).
 */
export function documentPassesCalculatedIdentityPipelineGate(
  doc: any,
  entityDefinition: Pick<EntityDefinitionWithoutId, 'identityField' | 'extraction'>,
  options?: EuidGateOptions
): boolean {
  const { identityField } = entityDefinition;
  const postAggFilter = getPostAggFilter(entityDefinition);
  const { applyPostAggFilter = true } = options ?? {};
  if (isSingleFieldIdentity(identityField)) {
    return true;
  }
  return evaluateStreamlangCondition(
    doc,
    mergeDocumentsFilterAndPostAgg(
      identityField.documentsFilter,
      applyPostAggFilter ? waiveForAlerts(postAggFilter) : undefined
    )
  );
}

/**
 * Resolves a FieldValue (literal, source, or composition) to a string for in-memory doc.
 */
export function resolveFieldValueSchema(doc: any, value: FieldValueSchema): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if ('source' in value) {
    return getFieldValue(doc, value.source);
  }
  const { fields, sep } = value.composition;
  const values = fields.map((f) => getFieldValue(doc, f));
  if (values.some((v) => v === undefined)) {
    return undefined;
  }
  return values.join(sep);
}

/**
 * Applies when-condition field overrides to doc (source/composition resolved per entry).
 * Used for `whenConditionTrueSetFieldsPreAgg` and `whenConditionTrueSetFieldsAfterStats` on a single-document simulation.
 */
export function applyWhenConditionTrueSetFields(
  doc: any,
  entries: Array<{ condition: unknown; fields: Record<string, FieldValueSchema> }>
): void {
  for (const entry of entries) {
    if (evaluateStreamlangCondition(doc, entry.condition)) {
      for (const [field, value] of Object.entries(entry.fields)) {
        const resolved = resolveFieldValueSchema(doc, value);
        if (resolved !== undefined) {
          doc[field] = resolved;
        }
      }
    }
  }
}

/**
 * Returns the effective euid ranking for a document. Iterates branches in order;
 * returns the first matching branch's ranking. Doc must have fieldEvaluations and
 * whenConditionTrueSetFieldsPreAgg already applied.
 */
export function getEffectiveEuidRanking(
  doc: any,
  identityField: CalculatedEntityIdentity
): EuidAttribute[][] {
  const { euidRanking } = identityField;
  for (const branch of euidRanking.branches) {
    if (!branch.when || evaluateStreamlangCondition(doc, branch.when)) {
      return branch.ranking;
    }
  }
  return euidRanking.branches[euidRanking.branches.length - 1]?.ranking ?? [];
}

export function getFieldsToBeFilteredOn(
  doc: any,
  euidFields: EuidAttribute[][],
  readValue: (doc: any, field: string) => string | undefined = getFieldValue
): { values: FieldValue; rankingPosition: number } {
  for (let i = 0; i < euidFields.length; i++) {
    const composition = euidFields[i];
    const fieldAttrs = composition.filter(isEuidField);
    const composedFieldValues = fieldAttrs.reduce(
      (acc, attr) => ({
        ...acc,
        [attr.field]: readValue(doc, attr.field),
      }),
      {}
    );

    if (Object.values(composedFieldValues).every((v) => v !== undefined)) {
      return { values: composedFieldValues, rankingPosition: i };
    }
  }
  return { values: {}, rankingPosition: -1 };
}

export function getFieldsToBeFilteredOut(
  euidFields: EuidAttribute[][],
  fieldsToBeFilteredOn: { values: FieldValue; rankingPosition: number }
): string[] {
  const euidFieldsBeforeRanking = euidFields.slice(0, fieldsToBeFilteredOn.rankingPosition);
  const fieldsNotInTheId = euidFieldsBeforeRanking.flatMap(getCompositionFields);

  const toFilterOut: string[] = [];
  for (const field of fieldsNotInTheId) {
    if (!Object.keys(fieldsToBeFilteredOn.values).includes(field) && !toFilterOut.includes(field)) {
      toFilterOut.push(field);
    }
  }
  return toFilterOut;
}

export function isEuidField(attr: EuidAttribute): attr is EuidField {
  return 'field' in attr;
}

export function isEuidSeparator(attr: EuidAttribute): attr is EuidSeparator {
  return 'sep' in attr;
}

export function getSourceFieldNames(sources: FieldEvaluationSource[]): {
  exactMatchFields: string[];
  prefixMatchFields: string[];
} {
  const exactMatchFields: string[] = [];
  const prefixMatchFields: string[] = [];
  for (const source of sources) {
    if ('field' in source) {
      exactMatchFields.push(source.field);
    } else {
      prefixMatchFields.push(source.firstChunkOfField);
    }
  }
  return { exactMatchFields, prefixMatchFields };
}

/** Throws when `type` cannot be safely emitted as the entity id prefix in a query string literal. */
export const assertEmittableEntityType = (type: string): void => {
  const reason = validateEntityDefinitionType(type);
  if (reason) {
    throw new Error(`Cannot emit the entity type prefix for '${type}': ${reason}`);
  }
};
