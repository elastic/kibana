/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorDefinition, RegisteredEvaluatorDefinition } from './types';

/**
 * Marks a registered evaluator as built-in. Copies the fields rather than spreading, so an
 * evaluator written as a class keeps its prototype `evaluate` and the receiver it expects.
 */
export const toBuiltIn = (definition: RegisteredEvaluatorDefinition): EvaluatorDefinition => ({
  name: definition.name,
  version: definition.version,
  kind: definition.kind,
  origin: 'built_in',
  description: definition.description,
  direction: definition.direction,
  ...(definition.referenceDataSchema
    ? { referenceDataSchema: definition.referenceDataSchema }
    : {}),
  ...(definition.evidenceSchema ? { evidenceSchema: definition.evidenceSchema } : {}),
  evaluate: (ctx) => definition.evaluate(ctx),
});
