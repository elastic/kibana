/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_BUILDER_REGISTRY } from './registry';
import type { BuilderState, BuilderSubmission } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Projects the active builder's form state onto a `builder_fields` payload.
 *
 * Returns `undefined` when the rule cannot be saved as builder-managed — an
 * unregistered type, or state the builder declines to serialize — so the caller
 * can fall back to saving a plain ES|QL rule.
 */
export const toBuilderSubmission = (
  builderType: string,
  builderState: BuilderState
): BuilderSubmission | undefined => {
  const definition = RULE_BUILDER_REGISTRY[builderType];
  if (!definition || builderState === undefined) {
    return undefined;
  }

  // Builders whose form state is already the persisted shape need no adapter.
  const fields = definition.toFields ? definition.toFields(builderState) : builderState;

  return isPlainObject(fields) ? { type: builderType, fields } : undefined;
};

/**
 * Rebuilds a builder's form state from the `builder_fields` stored on a rule.
 *
 * Returns `undefined` when the fields cannot be reopened in the builder, which
 * sends the caller to ES|QL mode rather than a partially populated form.
 */
export const fromBuilderFields = (
  builderType: string,
  builderFields: unknown
): BuilderState | undefined => {
  const definition = RULE_BUILDER_REGISTRY[builderType];
  if (!definition || !isPlainObject(builderFields)) {
    return undefined;
  }

  const state = definition.fromFields ? definition.fromFields(builderFields) : builderFields;

  return state === null ? undefined : state;
};
