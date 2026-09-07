/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { matchesEvidenceText } from '../../common/matches_evidence_text';

/** Dotted paths may include numeric segments for array indices (e.g. `labels.0.key`). */
const FIELD_PATH_KEY = '[a-zA-Z_][a-zA-Z0-9_/\\-]*(?:\\.(?:[a-zA-Z_][a-zA-Z0-9_/\\-]*|[0-9]+))*';
const FIELD_PATH_PATTERN = new RegExp(`^(${FIELD_PATH_KEY})`);
const MULTI_KV_EQUALS_PATTERN = new RegExp(
  `(${FIELD_PATH_KEY})\\s*=\\s*([^\\s]+(?:\\s+(?!${FIELD_PATH_KEY}\\s*=)[^\\s]+)*)`,
  'g'
);
const MULTI_KV_COLON_PATTERN = new RegExp(
  `(${FIELD_PATH_KEY})\\s*:\\s*([^\\s]+(?:\\s+(?!${FIELD_PATH_KEY}\\s*:)[^\\s]+)*)`,
  'g'
);

/**
 * Parses a structured evidence string into a single `{ key, value }` pair.
 * Tries `field.path=value` first, then falls back to `field.path: value`.
 * Returns `undefined` if the evidence doesn't match either format.
 */
function parseKeyValuePair(evidence: string): { key: string; value: string } | undefined {
  return parseFieldEqualsValue(evidence) ?? parseFieldColonValue(evidence);
}

/**
 * Parses evidence of the form `field.path=value`, splitting on the first `=`.
 * Returns a single key-value pair, or `undefined` if the string doesn't match.
 */
function parseFieldEqualsValue(evidence: string): { key: string; value: string } | undefined {
  const eqIndex = evidence.indexOf('=');
  if (eqIndex === -1) {
    return undefined;
  }

  const candidateKey = evidence.slice(0, eqIndex);
  const fieldMatch = FIELD_PATH_PATTERN.exec(candidateKey);
  if (!fieldMatch) {
    return undefined;
  }

  const value = evidence.slice(eqIndex + 1).trim();
  if (value.length === 0) {
    return undefined;
  }

  return { key: fieldMatch[1], value };
}

/**
 * Parses evidence of the form `field.path: value`, splitting on the first `:`.
 * Returns a single key-value pair, or `undefined` if the string doesn't match.
 */
function parseFieldColonValue(evidence: string): { key: string; value: string } | undefined {
  const colonIndex = evidence.indexOf(':');
  if (colonIndex === -1) {
    return undefined;
  }

  const candidateKey = evidence.slice(0, colonIndex);
  const fieldMatch = FIELD_PATH_PATTERN.exec(candidateKey);
  if (!fieldMatch) {
    return undefined;
  }

  const value = evidence.slice(colonIndex + 1).trim();
  if (value.length === 0) {
    return undefined;
  }

  return { key: fieldMatch[1], value };
}

function matchKvPairs(evidence: string, pattern: RegExp): Array<{ key: string; value: string }> {
  const pairs: Array<{ key: string; value: string }> = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(evidence)) !== null) {
    pairs.push({ key: match[1], value: match[2] });
  }
  return pairs;
}

/**
 * Extracts key-value pairs from a single evidence string
 * (e.g. `"body.text=hello http.status=200"`). Values may contain spaces as
 * long as the next word doesn't start a new key-value pair.
 * Tries `=` as delimiter first, then falls back to `:`.
 */
function parseKeyValuePairs(evidence: string): Array<{ key: string; value: string }> {
  const equalsPairs = matchKvPairs(evidence, MULTI_KV_EQUALS_PATTERN);
  if (equalsPairs.length > 0) {
    return equalsPairs;
  }
  return matchKvPairs(evidence, MULTI_KV_COLON_PATTERN);
}

function getNestedValue(doc: Record<string, unknown>, path: string): unknown {
  if (path in doc) {
    return doc[path];
  }

  return get(doc, path);
}

/**
 * Recursively extracts all string values from a document object,
 * so direct-quote evidence can be matched against any field.
 */
function getAllStringValues(doc: Record<string, unknown>): string[] {
  const values: string[] = [];

  const walk = (obj: unknown) => {
    if (typeof obj === 'string') {
      values.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item);
      }
    } else if (obj !== null && typeof obj === 'object') {
      for (const val of Object.values(obj as Record<string, unknown>)) {
        walk(val);
      }
    }
  };

  walk(doc);
  return values;
}

/**
 * Normalizes an evidence string before grounding checks.
 * Strips trailing "..." truncation markers that models emit when they
 * abbreviate long field values (e.g. "body.text=Order confirmed: ...").
 * After stripping, the remaining prefix can still be matched as a substring.
 */
function normalizeEvidence(evidence: string): string {
  return evidence.replace(/\s*\.\.\.\s*$/, '').trimEnd();
}

/**
 * Checks whether a single evidence string is grounded in the input documents.
 *
 * 1. Direct quote: checks if the text appears as a substring in any string
 *    value across all document fields.
 * 2. Single key-value: parses `field.path=value` or `field.path: value` and
 *    checks that the value matches the corresponding document field.
 * 3. Multiple key-values: splits combined evidence like
 *    `"body.text=hello http.status=200"` into individual pairs and checks
 *    that every pair matches a document field.
 *
 * Evidence strings are normalized before matching: trailing "..." truncation
 * markers are stripped so partially-quoted values can still be grounded.
 */
export function isEvidenceGrounded(
  evidence: string,
  documents: Array<Record<string, unknown>>
): boolean {
  evidence = normalizeEvidence(evidence);
  const matchesStringValue = documents.some((doc) => {
    const allValues = getAllStringValues(doc);
    return allValues.some((val) => matchesEvidenceText(val, evidence));
  });

  if (matchesStringValue) {
    return true;
  }

  const kvPair = parseKeyValuePair(evidence);
  if (kvPair) {
    const matchesDocumentKey = documents.some((doc) => {
      const docValue = getNestedValue(doc, kvPair.key);
      return docValue !== undefined && matchesEvidenceText(String(docValue), kvPair.value);
    });
    if (matchesDocumentKey) {
      return true;
    }
  }

  const kvPairs = parseKeyValuePairs(evidence);
  if (kvPairs.length > 0) {
    const allPairsGrounded = kvPairs.every((pair) =>
      documents.some((doc) => {
        const docValue = getNestedValue(doc, pair.key);
        return docValue !== undefined && matchesEvidenceText(String(docValue), pair.value);
      })
    );
    if (allPairsGrounded) {
      return true;
    }
  }

  return false;
}
