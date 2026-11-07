/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import { CaseAiVerdictSchema, CaseVerdictSchema } from '../../case/v1';

export const AiVerdictUserActionPayloadSchema = lazySchema(() =>
  z.object({
    ai_verdict: CaseAiVerdictSchema.nullable(),
  })
);

export const AiVerdictUserActionSchema = lazySchema(() =>
  z.object({
    type: z.literal(UserActionTypes.ai_verdict),
    payload: AiVerdictUserActionPayloadSchema,
  })
);

export const HumanVerdictUserActionPayloadSchema = lazySchema(() =>
  z.object({
    human_verdict: CaseVerdictSchema.nullable(),
  })
);

export const HumanVerdictUserActionSchema = lazySchema(() =>
  z.object({
    type: z.literal(UserActionTypes.human_verdict),
    payload: HumanVerdictUserActionPayloadSchema,
  })
);
