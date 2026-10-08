/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PersistedEvaluator } from '@kbn/evals-common';
import type { EvaluatorDefinitionDocument } from '../../../evaluators/user_defined/types';

/**
 * The API view of a stored definition. Drops the document id, which is derived
 * from the name, version, and space and so tells a caller nothing it cannot
 * already address the evaluator by.
 */
export const toPersistedEvaluatorResponse = (
  document: EvaluatorDefinitionDocument
): PersistedEvaluator => ({
  name: document.name,
  version: document.version,
  kind: document.kind,
  origin: 'user_defined',
  description: document.description,
  judge: document.judge,
  created_at: document.created_at,
  updated_at: document.updated_at,
  ...(document.created_by ? { created_by: document.created_by } : {}),
});
