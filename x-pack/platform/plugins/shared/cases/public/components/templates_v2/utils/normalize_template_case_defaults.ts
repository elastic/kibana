/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YAMLMap } from 'yaml';
import { isMap, parse as yamlParse, parseDocument } from 'yaml';
import { isPlainObject } from 'lodash';

// The current case-default title key, and the legacy key it superseded.
const CASE_TITLE_KEY = 'name';
const LEGACY_TITLE_KEY = 'title';

const isPlainRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

const normalizeCaseDefaultsObject = (
  definition: Record<string, unknown>
): Record<string, unknown> => {
  const normalized = { ...definition };
  if (
    typeof normalized[CASE_TITLE_KEY] !== 'string' &&
    typeof normalized[LEGACY_TITLE_KEY] === 'string'
  ) {
    normalized[CASE_TITLE_KEY] = normalized[LEGACY_TITLE_KEY];
  }
  delete normalized[LEGACY_TITLE_KEY];
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

    root.delete(LEGACY_TITLE_KEY);

    const canonicalTitle = normalizedObject[CASE_TITLE_KEY];
    if (typeof canonicalTitle === 'string' && canonicalTitle.length > 0) {
      root.set(CASE_TITLE_KEY, canonicalTitle);
    }

    return doc.toString();
  } catch {
    return definitionYaml;
  }
};
