/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

export const DecisionOutcomeSchema = lazySchema(() => z.enum(['approved', 'dismissed']));

/** A proposal decided on the case. The user action's author is the person who decided it. */
export const DecisionUserActionPayloadSchema = lazySchema(() =>
  z.object({
    decision: z.object({
      proposal_id: z.string(),
      title: z.string(),
      outcome: DecisionOutcomeSchema,
    }),
  })
);

export const DecisionUserActionSchema = lazySchema(() =>
  z.object({
    type: z.literal(UserActionTypes.decision),
    payload: DecisionUserActionPayloadSchema,
  })
);
