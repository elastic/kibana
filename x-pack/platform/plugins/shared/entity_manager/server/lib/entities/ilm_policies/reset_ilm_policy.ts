/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPutLifecycleRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_RESET_ILM_POLICY } from '../../../../common/constants_entities';

export const generateEntitiesResetILMPolicy = (): IlmPutLifecycleRequest => ({
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
  name: ENTITY_RESET_ILM_POLICY,
});
