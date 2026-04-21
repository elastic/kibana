/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const EVALUATOR_SAVED_OBJECT_TYPE = 'evals-custom-evaluator';

export interface CustomEvaluatorAttributes {
  name: string;
  kind: 'LLM' | 'CODE';
  type: 'llm-judge' | 'code' | 'esql';
  description: string;
  config: Record<string, unknown>;
  version: number;
  tags: Record<string, string>;
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export const evaluatorSavedObjectType: SavedObjectsType = {
  name: EVALUATOR_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      kind: { type: 'keyword' },
      type: { type: 'keyword' },
      description: { type: 'text' },
      config: { type: 'object', enabled: false },
      version: { type: 'integer' },
      tags: { type: 'object', enabled: false },
      shared: { type: 'boolean' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
  // Baseline model version so future schema changes have a migration anchor.
  // Intentionally schema-less to avoid retroactively rejecting any existing
  // persisted attributes; future versions should add schemas + changes.
  modelVersions: {
    1: { changes: [] },
  },
};
