/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type PaginationInputPaginatedInput = z.input<typeof pagination>;

export const pagination = z
  .object({
    /** The activePage parameter defines the page of results you want to fetch */
    activePage: z.number(),
    /** The cursorStart parameter defines the start of the results to be displayed */
    cursorStart: z.number().optional(),
    /** The querySize parameter is the number of items to be returned */
    querySize: z.number(),
  })
  .passthrough()
  .optional();
