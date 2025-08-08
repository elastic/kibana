/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { suggestionOwnerSchema, suggestionContextRt } from '../../domain/suggestion/v1';

export const suggestionRequestRt = z.object({
  owners: z.array(suggestionOwnerSchema),
  context: suggestionContextRt,
});

export type SuggestionRequest = z.infer<typeof suggestionRequestRt>;
