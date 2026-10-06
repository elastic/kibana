/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export declare const assignConversationRequestParamsSchema: z.ZodObject<
  {
    id: z.ZodString;
  },
  z.core.$strip
>;
/**
 * Replace-in-full assignee list. The caller sends the complete desired set;
 * omitting a uid removes it.
 */
export declare const assignConversationRequestBodySchema: z.ZodObject<
  {
    assignees: z.ZodArray<z.ZodString>;
  },
  z.core.$strip
>;
export type AssignConversationRequest = z.infer<typeof assignConversationRequestBodySchema>;
