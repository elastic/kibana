/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YAMLMap } from 'yaml';
import { isMap, parse as yamlParse, parseDocument } from 'yaml';

const TOP_LEVEL_CASE_TITLE_KEY = 'name';

const LEGACY_CASE_DEFAULT_KEYS = [
  'title',
] as const;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const normalizeCaseDefaultsObject = (definition: Record<string, unknown>): Record<string, unknown> => {
  const normalized = { ...definition };
  if (typeof normalized[TOP_LEVEL_CASE_TITLE_KEY] !== 'string' && typeof normalized.title === 'string') {
    normalized[TOP_LEVEL_CASE_TITLE_KEY] = normalized.title;
  }
  delete normalized.title;
  return normalized;
};

export const normalizeTemplateCaseDefaultsForValidation = (definition: unknown): unknown =>
  isPlainRecord(definition) ? normalizeCaseDefaultsObject(definition) : definition;

/**
 * Canonicalizes legacy top-level `title` into top-level `name` while preserving the rest of the
 * user's YAML formatting/comments.
 */
export const normalizeTemplateCaseDefaultsYaml = (definitionYaml: string): string => {
  if (!definitionYaml || definitionYaml.trim() === '') {
    return definitionYaml;
  }

  try {
    const parsed = yamlParse(definitionYaml);
    if (!isPlainRecord(parsed)) {
      return definitionYaml;
    }

    const normalizedObject = normalizeCaseDefaultsObject(parsed);

    const doc = parseDocument(definitionYaml);
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }

    const root = doc.contents as YAMLMap<unknown, unknown>;

    for (const key of LEGACY_CASE_DEFAULT_KEYS) {
      root.delete(key);
    }

    if (
      typeof normalizedObject[TOP_LEVEL_CASE_TITLE_KEY] === 'string' &&
      normalizedObject[TOP_LEVEL_CASE_TITLE_KEY].length > 0
    ) {
      root.set(TOP_LEVEL_CASE_TITLE_KEY, normalizedObject[TOP_LEVEL_CASE_TITLE_KEY]);
    }

    return doc.toString();
  } catch {
    return definitionYaml;
  }
};
