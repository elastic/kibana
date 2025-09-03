/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPutLifecycleRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import { generateResetILMPolicyId } from '../helpers/generate_component_id';

export const generateEntitiesResetILMPolicy = (
  definition: EntityDefinition
): IlmPutLifecycleRequest => ({
  policy: {
    phases: {
      hot: {
        actions: {},
      },
      delete: {
        min_age: '6h',
        actions: {
          delete: {},
        },
      },
    },
  },
  name: generateResetILMPolicyId(definition),
});
