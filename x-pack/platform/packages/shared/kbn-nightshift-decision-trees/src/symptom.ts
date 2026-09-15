/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Prefix for decision-tree identifiers. Trees are keyed by the symptom they diagnose. */
export const SYMPTOM_TREE_ID_PREFIX = 'symptom:';

/** Sandbox directory holding every decision-tree markdown file. */
export const DECISION_TREE_DIRECTORY = 'decision-trees';

const DECISION_TREE_FILE_PREFIX = 'decision_tree_';

const MAX_SLUG_LENGTH = 80;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MIN_SLUG_WORDS = 2;
const MAX_SLUG_WORDS = 5;

/**
 * Normalizes free text into the kebab-case slug shape Cortex ids use.
 * Mirrors `canonicalizeSlug` in the Cortex page store so a slug survives the round trip.
 */
export const normalizeSymptomSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

/** Builds the `symptom:<slug>` identifier a tree is stored under. */
export const symptomTreeId = (slug: string): string =>
  `${SYMPTOM_TREE_ID_PREFIX}${normalizeSymptomSlug(slug)}`;

/** Returns the bare slug for a tree id, tolerating an id that is already a bare slug. */
export const symptomSlugFromTreeId = (treeId: string): string =>
  normalizeSymptomSlug(
    treeId.startsWith(SYMPTOM_TREE_ID_PREFIX) ? treeId.slice(SYMPTOM_TREE_ID_PREFIX.length) : treeId
  );

/** Workspace-relative path of the markdown file backing a symptom's decision tree. */
export const symptomFilePath = (slugOrTreeId: string): string =>
  `${DECISION_TREE_DIRECTORY}/${DECISION_TREE_FILE_PREFIX}${symptomSlugFromTreeId(
    slugOrTreeId
  )}.md`;

/** True when `treeId` uses the `symptom:` prefix required of newly created trees. */
export const isSymptomTreeId = (treeId: string): boolean =>
  treeId.startsWith(SYMPTOM_TREE_ID_PREFIX) && treeId.length > SYMPTOM_TREE_ID_PREFIX.length;

/**
 * Validates a symptom slug against the authoring contract: kebab-case, 2-5 words,
 * letters and digits only. Returns the reason it failed, or undefined when valid.
 */
export const symptomSlugError = (slug: string): string | undefined => {
  if (!slug) {
    return 'Symptom slug is required';
  }
  if (!SLUG_PATTERN.test(slug)) {
    return `Symptom slug must be kebab-case using only lowercase letters, digits and single hyphens: got "${slug}"`;
  }
  const words = slug.split('-').length;
  if (words < MIN_SLUG_WORDS || words > MAX_SLUG_WORDS) {
    return `Symptom slug must be ${MIN_SLUG_WORDS}-${MAX_SLUG_WORDS} words: got "${slug}" with ${words}`;
  }
  return undefined;
};
