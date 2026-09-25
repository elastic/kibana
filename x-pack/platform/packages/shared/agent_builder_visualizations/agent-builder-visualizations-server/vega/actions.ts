/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolveEsqlAction } from '../shared/run_resolve_esql_node';

export interface AuthorSpecAction {
  type: 'author_spec';
  success: boolean;
  /** Raw spec object parsed from the model response; shape is validated later. */
  spec?: Record<string, unknown>;
  /** Panel / visualization title from the authoring response schema. */
  title?: string;
  /** One-sentence factual description of the authored chart and presentation choices. */
  authoringNote?: string;
  attempt: number;
  error?: string;
}

/** Action recording the outcome of the structural check + normalization of a spec. */
export interface ValidateSpecAction {
  type: 'validate_spec';
  success: boolean;
  /** The finalized, render-ready spec serialized as the string the embeddable expects. */
  spec?: string;
  /** Panel / visualization title carried through from the matching authoring attempt. */
  title?: string;
  /** Authoring note carried through from the matching authoring attempt. */
  authoringNote?: string;
  attempt: number;
  error?: string;
}

export type VegaAction = ResolveEsqlAction | AuthorSpecAction | ValidateSpecAction;

export const isResolveEsqlAction = (action: VegaAction): action is ResolveEsqlAction =>
  action.type === 'resolve_esql';

export const isAuthorSpecAction = (action: VegaAction): action is AuthorSpecAction =>
  action.type === 'author_spec';

export const isValidateSpecAction = (action: VegaAction): action is ValidateSpecAction =>
  action.type === 'validate_spec';

// Node name constants
export const RESOLVE_ESQL_NODE = 'resolve_esql';
export const SELECT_EXAMPLES_NODE = 'select_reference_examples';
export const AUTHOR_SPEC_NODE = 'author_spec';
export const VALIDATE_SPEC_NODE = 'validate_spec';
export const FINALIZE_NODE = 'finalize';

// Configuration constants
export const MAX_RETRY_ATTEMPTS = 3;
