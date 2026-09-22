/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { indexLifecyclePhaseSchema } from './storage_explorer_types';
import { IndexLifecyclePhaseSelectOption } from './ilm_types';

describe('indexLifecyclePhaseSchema', () => {
  it('accepts each known lifecycle phase', () => {
    for (const value of Object.values(IndexLifecyclePhaseSelectOption)) {
      expectParseSuccess(indexLifecyclePhaseSchema.safeParse({ indexLifecyclePhase: value }));
    }
  });

  it('rejects an unknown lifecycle phase', () => {
    expectParseError(indexLifecyclePhaseSchema.safeParse({ indexLifecyclePhase: 'melting' }));
  });
});
