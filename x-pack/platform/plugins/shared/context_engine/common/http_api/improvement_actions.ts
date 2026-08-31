/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What an improvement does when applied, and therefore what an analysis run may
 * propose. Verbs rather than kinds, because retiring a KI or disabling a
 * workflow is a first-class outcome of the analysis and `*_change` cannot
 * express it.
 *
 * A `remove_*` action records only the intent to remove. How a removal is
 * carried out — a soft flag, a hard delete, a sibling index — is owned by the
 * KI lifecycle and settled by the apply step.
 */
export type ImprovementAction =
  | 'add_ki'
  | 'edit_ki'
  | 'remove_ki'
  | 'add_workflow'
  | 'edit_workflow'
  | 'remove_workflow'
  | 'add_source'
  | 'edit_source'
  | 'remove_source';

export const IMPROVEMENT_ACTIONS: readonly ImprovementAction[] = [
  'add_ki',
  'edit_ki',
  'remove_ki',
  'add_workflow',
  'edit_workflow',
  'remove_workflow',
  'add_source',
  'edit_source',
  'remove_source',
];
