/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';

export interface DeleteCustomLinkResponse {
  result: string;
}

export const deleteCustomLinkRoute = defineRoute<DeleteCustomLinkResponse>()({
  endpoint: 'DELETE /internal/apm/settings/custom_links/{id}',
  params: z.object({
    path: z.object({
      id: z.string().max(1024),
    }),
  }),
});
