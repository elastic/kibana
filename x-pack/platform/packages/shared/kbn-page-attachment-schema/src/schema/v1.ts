/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const pageAttachmentPersistedStateSchema = z.object({
  /**
   * The type of page or page asset, e.g., 'dashboard', 'synthetics-test-run', 'slo-history', etc
   */
  type: z.string(),
  url: z.object({
    /**
     * The URL to the page or page asset, excluding the base path.
     */
    pathAndQuery: z.string(),
    /**
     * The label to render in the "Go to" action, example "View in Dashboard" for the asset
     */
    actionLabel: z.string(),
    /**
     * The label to render in the attachment comment for the page or page asset
     */
    label: z.string(),
    /**
     * The icon representing the page type, displayed in the comment and action
     */
    /**
     * The icon, rendered via {@link EuiIcon}, representing the page type, displayed in the comment and action.
     */
    iconType: z.string().optional(),
  }),
  /**
   * Optional screen context for the page. A plain text description that
   * can be provided to an LLM to generate a summary or perform analysis
   */
  screenContext: z.array(z.object({ screenDescription: z.string() })).optional(),
});

export type PageAttachmentPersistedState = z.infer<typeof pageAttachmentPersistedStateSchema>;
