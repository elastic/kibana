/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';

export const CRAWL_STEP_ID = 'connector-memory.crawl' as const;

/**
 * Everything memory does with a connector is this one step with different inputs: a scheduled crawl (a `folder`), an
 * agent's read (`files`, and `around` them), or a manual run of either.
 */
export const crawlInputSchema = lazySchema(() =>
  z.object({
    connector_id: z
      .string()
      .min(1)
      .max(255)
      .describe('The connector to read, as the user running the workflow'),
    folder: z
      .string()
      .max(2048)
      .optional()
      .describe('Crawl from this location, as the connector names it; empty is the top'),
    max_depth: z
      .number()
      .int()
      .min(0)
      .max(10)
      .default(1)
      .describe('Folder levels below the folder to read'),
    max_items: z.number().int().min(1).max(5000).default(100).describe('Most files in one run'),
    mode: z
      .enum(['names', 'full'])
      .default('names')
      .describe("How the folder's files are remembered: by name, or read and summarized"),
    files: z
      .array(z.string().min(1).max(2048))
      .max(50)
      .default([])
      .describe('Files to remember, by their id at the source'),
    file_mode: z.enum(['names', 'full']).default('full').describe('How `files` are remembered'),
    around: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .describe(
        'Also remember the folder of each of `files`, and this many levels below it, the same way as `files`'
      ),
    entries: z
      .array(
        z.object({
          id: z.string().min(1).max(2048),
          name: z.string().min(1).max(1024),
          url: z.string().min(1).max(2048),
          mimeType: z.string().max(255).optional(),
          modifiedAt: z.string().max(64).optional(),
          size: z.number().optional(),
        })
      )
      .max(50)
      .default([])
      .describe('Files already seen, to remember by name without looking them up'),
    inference_connector_id: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe('The model that writes summaries; absent follows the server'),
  })
);

export const crawlOutputSchema = lazySchema(() =>
  z.object({
    planned: z.number().describe('Files chosen to look at'),
    written: z.number().describe('Knowledge indicators written'),
    unchanged: z.number().describe('Files already remembered as well as this would'),
    failed: z.number().describe('Files that failed'),
    truncated: z
      .boolean()
      .describe('True when the file limit stopped the run before every folder was read'),
  })
);

export type CrawlInput = z.infer<typeof crawlInputSchema>;
export type CrawlOutput = z.infer<typeof crawlOutputSchema>;

export const crawlStepCommonDefinition: CommonStepDefinition<
  typeof crawlInputSchema,
  typeof crawlOutputSchema
> = {
  id: CRAWL_STEP_ID,
  label: i18n.translate('xpack.connectorMemory.workflows.steps.crawl.label', {
    defaultMessage: 'Remember a connector’s files',
  }),
  description: i18n.translate('xpack.connectorMemory.workflows.steps.crawl.description', {
    defaultMessage:
      'Reads folders or files of a content connector as the user running the workflow, and remembers each file as a knowledge indicator in the connector memory index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: crawlInputSchema,
  outputSchema: crawlOutputSchema,
  documentation: {
    details: i18n.translate('xpack.connectorMemory.workflows.steps.crawl.documentation.details', {
      defaultMessage:
        'Writes one knowledge indicator per file, under the same id however the file was found, so repeated runs and agent reads never duplicate. Files already remembered as well as this run would are left alone. Under a connector that authorizes each user separately, a knowledge indicator is visible only to the users who proved access to the file.',
    }),
    examples: [
      `## Remember the names of every file a connector can list, two levels deep
\`\`\`yaml
- name: remember
  type: ${CRAWL_STEP_ID}
  with:
    connector_id: my-connector
    folder: ""
    max_depth: 2
    max_items: 500
\`\`\``,
    ],
  },
};
