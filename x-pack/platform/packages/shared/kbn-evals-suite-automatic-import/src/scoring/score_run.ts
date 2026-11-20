/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutomaticImportExampleExpected, AutomaticImportRunOutput } from '../types';
import type { EcsFields } from './ecs_fields';
import { acceptedFields, isScoredField } from './field_rules';
import { flattenDocument } from './flatten_document';
import { normalizeValue } from './normalize_value';

export interface MisplacedValue {
  readonly expectedField: string;
  readonly foundField: string;
  readonly count: number;
}

export interface RunScore {
  readonly totalLines: number;
  readonly parsedLines: number;
  /** Scored fields in the expected docs, and how many the generated docs got right. */
  readonly expectedFields: number;
  readonly matchedExpectedFields: number;
  /** Scored fields in the generated docs, and how many are correct. */
  readonly generatedFields: number;
  readonly matchedGeneratedFields: number;
  /** Generated fields the expected docs don't have, and how many of those are correct. */
  readonly extraFields: number;
  readonly correctExtraFields: number;
  /** Expected values that were missing from their field but present under another one. */
  readonly misplaced: readonly MisplacedValue[];
}

/** A generated field the expected doc for the same line doesn't have. */
export interface ExtraField {
  /** Index of the sample line. */
  readonly line: number;
  readonly field: string;
  readonly value: unknown;
  /** Every field of the generated doc, flattened. */
  readonly doc: Record<string, unknown>;
}

/** Identifies an extra field on a line, for the set of extras judged correct. */
export const extraFieldKey = (line: number, field: string): string => `${line}\u0000${field}`;

const scoredEntries = (
  flatDoc: Record<string, unknown>,
  unscoredFields: readonly string[],
  ecsFields: EcsFields
): Array<[string, unknown]> =>
  Object.entries(flatDoc).filter(([field]) => isScoredField(field, unscoredFields, ecsFields));

type NormalizedFields = ReadonlyMap<string, string>;

const scoredFields = (
  doc: Record<string, unknown>,
  unscoredFields: readonly string[],
  ecsFields: EcsFields
): NormalizedFields =>
  new Map(
    scoredEntries(flattenDocument(doc), unscoredFields, ecsFields).map(([field, value]) => [
      field,
      normalizeValue(value),
    ])
  );

const hasValueAt = (field: string, value: string, fields: NormalizedFields): boolean =>
  acceptedFields(field).some((candidate) => fields.get(candidate) === value);

const hasField = (field: string, fields: NormalizedFields): boolean =>
  acceptedFields(field).some((candidate) => fields.has(candidate));

/** Generated fields that the expected doc for the same line has no value for. */
export const findExtraFields = (
  { status, lines }: AutomaticImportRunOutput,
  { samples }: AutomaticImportExampleExpected,
  ecsFields: EcsFields
): ExtraField[] =>
  status !== 'completed'
    ? []
    : samples.flatMap(({ expected, unscoredFields = [] }, line) => {
        const generatedDoc = lines[line]?.doc;
        if (!generatedDoc) {
          return [];
        }
        const expectedValues = scoredFields(expected, unscoredFields, ecsFields);
        const doc = flattenDocument(generatedDoc);
        return scoredEntries(doc, unscoredFields, ecsFields)
          .filter(([field]) => !hasField(field, expectedValues))
          .map(([field, value]) => ({ line, field, value, doc }));
      });

/**
 * Compares every generated doc with the expected doc for the same line. A generated field the
 * expected doc doesn't have counts as correct only if it's in `correctExtras`.
 */
export const scoreRun = (
  { status, lines }: AutomaticImportRunOutput,
  { samples }: AutomaticImportExampleExpected,
  ecsFields: EcsFields,
  correctExtras: ReadonlySet<string>
): RunScore => {
  const misplaced = new Map<string, MisplacedValue>();
  let parsedLines = 0;
  let expectedFields = 0;
  let matchedExpectedFields = 0;
  let generatedFields = 0;
  let matchedGeneratedFields = 0;
  let extraFields = 0;
  let correctExtraFields = 0;

  samples.forEach(({ expected, unscoredFields = [] }, index) => {
    const expectedValues = scoredFields(expected, unscoredFields, ecsFields);
    expectedFields += expectedValues.size;

    const generatedDoc = status === 'completed' ? lines[index]?.doc : undefined;
    if (!generatedDoc) {
      return;
    }
    parsedLines++;
    const generatedValues = scoredFields(generatedDoc, unscoredFields, ecsFields);
    generatedFields += generatedValues.size;

    expectedValues.forEach((value, field) => {
      if (hasValueAt(field, value, generatedValues)) {
        matchedExpectedFields++;
        return;
      }
      generatedValues.forEach((generatedValue, foundField) => {
        if (generatedValue !== value) {
          return;
        }
        const key = `${field} -> ${foundField}`;
        const count = (misplaced.get(key)?.count ?? 0) + 1;
        misplaced.set(key, { expectedField: field, foundField, count });
      });
    });

    generatedValues.forEach((value, field) => {
      if (hasValueAt(field, value, expectedValues)) {
        matchedGeneratedFields++;
        return;
      }
      if (hasField(field, expectedValues)) {
        return;
      }
      extraFields++;
      if (correctExtras.has(extraFieldKey(index, field))) {
        correctExtraFields++;
        matchedGeneratedFields++;
      }
    });
  });

  return {
    totalLines: samples.length,
    parsedLines,
    expectedFields,
    matchedExpectedFields,
    generatedFields,
    matchedGeneratedFields,
    extraFields,
    correctExtraFields,
    misplaced: [...misplaced.values()].sort((a, b) => b.count - a.count),
  };
};

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

export const recall = (score: RunScore): number =>
  ratio(score.matchedExpectedFields, score.expectedFields);

export const precision = (score: RunScore): number =>
  ratio(score.matchedGeneratedFields, score.generatedFields);

export const f1 = (score: RunScore): number => {
  const r = recall(score);
  const p = precision(score);
  return r + p === 0 ? 0 : (2 * r * p) / (r + p);
};
