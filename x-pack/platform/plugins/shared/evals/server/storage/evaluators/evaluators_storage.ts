/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { EvaluationIndices } from '@kbn/evals-common';
import { types } from '@kbn/storage-adapter';
import type { LlmJudgeConfig } from '../../evaluators/user_defined/types';

export const evaluatorsStorageSettings = {
  name: EvaluationIndices.EVALUATORS,
  schema: {
    properties: {
      name: types.keyword({}),
      version: types.keyword({}),
      kind: types.keyword({}),
      description: types.text({}),
      space_ids: types.keyword({}),
      // Nothing searches inside a judge config, and its shape is owned by the
      // definition model rather than the mapping.
      judge: types.object({ dynamic: false, properties: {} }),
      created_at: types.date({}),
      updated_at: types.date({}),
      created_by: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export interface EvaluatorStorageProperties {
  name: string;
  version: string;
  kind: 'llm';
  description: string;
  /**
   * The spaces the definition is visible in. A single space today; the array
   * leaves room for sharing without a mapping change.
   */
  space_ids?: string[];
  judge: LlmJudgeConfig;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
