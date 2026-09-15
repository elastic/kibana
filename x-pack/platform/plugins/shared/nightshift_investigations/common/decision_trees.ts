/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CortexEntityType } from './cortex';

/**
 * Decision trees live alongside the rest of the Cortex wiki as runbook pages, so they are
 * searchable and browsable with everything else the investigator already reads.
 */
export const DECISION_TREE_ENTITY_TYPE: CortexEntityType = 'runbook';

/**
 * Marks a runbook page as a decision tree.
 *
 * Two independent writers share the Cortex index: the Cortex optimizer, which proposes free-form
 * wiki edits, and the reinforcement agent, which owns decision trees. The prefix is what lets the
 * optimizer leave these pages alone instead of rewriting a Mermaid tree it does not understand.
 */
export const DECISION_TREE_SLUG_PREFIX = 'decision-tree-';

/** Marks a page as one of the reinforcement agent's single-slot learning records. */
export const LEARNING_SLUG_PREFIX = 'learning-';

export const isDecisionTreeSlug = (slug: string): boolean =>
  slug.startsWith(DECISION_TREE_SLUG_PREFIX) && slug.length > DECISION_TREE_SLUG_PREFIX.length;

export const isLearningSlug = (slug: string): boolean =>
  slug.startsWith(LEARNING_SLUG_PREFIX) && slug.length > LEARNING_SLUG_PREFIX.length;

/**
 * True for pages the reinforcement agent owns end to end.
 *
 * These carry validated structure (a Mermaid tree, or a one-slot learning capped at four lines),
 * so the Cortex optimizer must not rewrite them through its free-form edit path.
 */
export const isReinforcementOwnedSlug = (slug: string): boolean =>
  isDecisionTreeSlug(slug) || isLearningSlug(slug);
