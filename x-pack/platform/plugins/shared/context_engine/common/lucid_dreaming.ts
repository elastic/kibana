/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { MAX_DREAMING_STEP_MEMORIES } from './dreaming';

export const LUCID_DREAMING_BATCH_READY_TRIGGER_ID = 'context-engine.lucidDreamingBatchReady';

/** The most memories or rounds one lucid dreaming batch names. */
export const MAX_LUCID_DREAMING_BATCH_ITEMS = MAX_DREAMING_STEP_MEMORIES;

const MAX_ID_LENGTH = 512;
const MAX_TIMESTAMP_LENGTH = 64;

export const lucidDreamingBatchReadyEventSchema = lazySchema(() =>
  z.object({
    ai_index_id: z.string().max(MAX_ID_LENGTH).describe('The AI index the batch dreams for.'),
    source: z
      .enum(['memories', 'traces'])
      .describe('What the batch holds: saved memories, or agent rounds read from traces.'),
    memory_ids: z
      .array(z.string().max(MAX_ID_LENGTH))
      .max(MAX_LUCID_DREAMING_BATCH_ITEMS)
      .optional()
      .describe('The ids of the memories in the batch, when source is memories.'),
    rounds: z
      .array(
        z.object({
          trace_id: z.string().max(MAX_ID_LENGTH),
          ended_at: z.string().max(MAX_TIMESTAMP_LENGTH),
        })
      )
      .max(MAX_LUCID_DREAMING_BATCH_ITEMS)
      .optional()
      .describe('The rounds in the batch, by trace id and when they ended, when source is traces.'),
  })
);

export type LucidDreamingBatchReadyEvent = z.infer<typeof lucidDreamingBatchReadyEventSchema>;

export const lucidDreamingBatchReadyTriggerDefinition: CommonTriggerDefinition = {
  id: LUCID_DREAMING_BATCH_READY_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: lucidDreamingBatchReadyEventSchema,
  title: i18n.translate('xpack.contextEngine.workflowTriggers.lucidDreamingBatchReady.title', {
    defaultMessage: 'Context Engine - Lucid dreaming batch ready',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflowTriggers.lucidDreamingBatchReady.description',
    {
      defaultMessage:
        'Emitted when new memories or agent rounds of an AI index are ready to dream on. The event names them by id; read them as the workflow user.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflowTriggers.lucidDreamingBatchReady.documentation.details',
      {
        defaultMessage:
          'Context Engine watches each AI index that has lucid dreaming on, and emits one event per small batch of new memories or agent rounds. Filter on event.ai_index_id and event.source.',
      }
    ),
    examples: [
      `## Dream on new memories of one AI index
\`\`\`yaml
triggers:
  - type: ${LUCID_DREAMING_BATCH_READY_TRIGGER_ID}
    on:
      condition: 'event.ai_index_id: "support-cases" and event.source: "memories"'
\`\`\``,
    ],
  },
  snippets: { condition: 'event.source: "memories"' },
};
