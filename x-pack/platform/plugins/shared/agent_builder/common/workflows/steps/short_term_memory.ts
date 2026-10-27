/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import {
  SHORT_TERM_MEMORY_LIMITS,
  SHORT_TERM_MEMORY_PROMOTION_STATUSES,
  SHORT_TERM_MEMORY_TYPES,
} from '@kbn/agent-builder-common';

export const ListShortTermMemoriesStepTypeId = 'ai.memory.short_term.list';
export const SetShortTermMemoryPromotionStepTypeId = 'ai.memory.short_term.set_promotion';
export const ListShortTermMemoriesByOwnerStepTypeId = 'ai.memory.short_term.list_by_owner';
export const ConsolidateShortTermMemoriesStepTypeId = 'ai.memory.short_term.consolidate';
export const DecayShortTermMemoriesStepTypeId = 'ai.memory.short_term.decay';

export const MAX_SHORT_TERM_MEMORY_STEP_IDS = 200;
const MAX_AGENT_IDS = 50;
const MAX_AGENT_ID_LENGTH = 512;
const MAX_AI_INDEX_ID_LENGTH = 512;
const MAX_USER_ID_LENGTH = 1024;
const MAX_OWNERS = 100;
const MAX_MEMORIES_PER_OWNER = 100;
const MAX_CONSOLIDATION_ENTRIES = 100;

const shortTermMemorySchema = z.object({
  id: z.string(),
  type: z.enum(SHORT_TERM_MEMORY_TYPES),
  title: z.string(),
  description: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  user_id: z.string(),
  user_name: z.string(),
  agent_id: z.string(),
  session_id: z.string(),
  space: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expires_at: z.string().optional(),
  last_used_at: z.string().optional(),
  promotion: z.object({
    status: z.enum(SHORT_TERM_MEMORY_PROMOTION_STATUSES),
    ai_index_id: z.string().optional(),
    ki_id: z.string().optional(),
    reason: z.string().optional(),
    updated_at: z.string().optional(),
  }),
});

const ListInputSchema = z.object({
  agent_ids: z
    .array(z.string().min(1).max(MAX_AGENT_ID_LENGTH))
    .max(MAX_AGENT_IDS)
    .optional()
    .meta({ description: 'Only memories recorded by these agents. Omit for every agent.' }),
  statuses: z
    .array(z.enum(SHORT_TERM_MEMORY_PROMOTION_STATUSES))
    .max(SHORT_TERM_MEMORY_PROMOTION_STATUSES.length)
    .optional()
    .meta({ description: 'Promotion statuses to include. Defaults to `pending`.' }),
  since: z
    .string()
    .max(64)
    .optional()
    .meta({ description: 'Only memories last written at or after this ISO 8601 time.' }),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_SHORT_TERM_MEMORY_STEP_IDS)
    .optional()
    .meta({ description: 'Maximum memories to return, oldest first. Defaults to 50.' }),
});

const ListOutputSchema = z.object({
  memories: z.array(shortTermMemorySchema).meta({
    description: 'Unexpired short-term memories in the workflow space, oldest first.',
  }),
});

const SetPromotionInputSchema = z.object({
  ids: z
    .array(z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.idLength))
    .max(MAX_SHORT_TERM_MEMORY_STEP_IDS)
    .meta({ description: 'The short-term memories the decision applies to.' }),
  status: z.enum(SHORT_TERM_MEMORY_PROMOTION_STATUSES).meta({
    description: '`promoted` once written to long-term memory, `rejected` when it should not be.',
  }),
  ai_index_id: z.string().max(MAX_AI_INDEX_ID_LENGTH).optional().meta({
    description: 'The AI index the memories were promoted into.',
  }),
  ki_id: z.string().max(SHORT_TERM_MEMORY_LIMITS.idLength).optional().meta({
    description: 'The long-term memory KI the memories became.',
  }),
  reason: z.string().max(SHORT_TERM_MEMORY_LIMITS.reasonLength).optional().meta({
    description: 'Why the memories were promoted or rejected. Shown to their owner.',
  }),
});

const SetPromotionOutputSchema = z.object({
  updated: z.number().meta({
    description:
      'How many memories were marked. A memory its owner revised meanwhile is skipped and stays pending.',
  }),
});

const agentIdsSchema = z
  .array(z.string().min(1).max(MAX_AGENT_ID_LENGTH))
  .max(MAX_AGENT_IDS)
  .optional()
  .meta({ description: 'Only memories recorded by these agents. Omit for every agent.' });

const ListByOwnerInputSchema = z.object({
  agent_ids: agentIdsSchema,
  changed_within_hours: z
    .number()
    .int()
    .min(1)
    .max(24 * 365)
    .optional()
    .meta({
      description:
        'Only owners with a memory written in the last N hours, so a run revisits only what changed. Omit for every owner.',
    }),
  max_owners: z
    .number()
    .int()
    .min(1)
    .max(MAX_OWNERS)
    .optional()
    .meta({ description: 'Maximum user and agent pairs to return. Defaults to 20.' }),
  max_memories: z
    .number()
    .int()
    .min(1)
    .max(MAX_MEMORIES_PER_OWNER)
    .optional()
    .meta({ description: 'Maximum memories per pair, newest first. Defaults to 50.' }),
});

const ListByOwnerOutputSchema = z.object({
  owners: z
    .array(
      z.object({
        user_id: z.string(),
        user_name: z.string(),
        agent_id: z.string(),
        memories: z.array(shortTermMemorySchema),
      })
    )
    .meta({
      description: "One entry per user and agent pair, with that pair's unexpired memories.",
    }),
});

const contentLimits = {
  title: z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.titleLength),
  description: z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.descriptionLength),
  content: z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.contentLength),
  tags: z
    .array(z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.tagLength))
    .max(SHORT_TERM_MEMORY_LIMITS.tags)
    .optional(),
};

const memoryIdSchema = z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.idLength);

const ConsolidateInputSchema = z.object({
  user_id: z
    .string()
    .min(1)
    .max(MAX_USER_ID_LENGTH)
    .meta({ description: 'Owner of the memories. Nothing of another owner is changed.' }),
  agent_id: z.string().min(1).max(MAX_AGENT_ID_LENGTH).meta({
    description: 'Agent the memories belong to.',
  }),
  merges: z
    .array(
      z.object({
        keep_id: memoryIdSchema.meta({ description: 'The memory that takes the merged content.' }),
        source_ids: z
          .array(memoryIdSchema)
          .min(1)
          .max(MAX_MEMORIES_PER_OWNER)
          .meta({ description: 'The memories merged into keep_id. They are deleted.' }),
        ...contentLimits,
      })
    )
    .max(MAX_CONSOLIDATION_ENTRIES)
    .optional()
    .meta({ description: 'Duplicates or overlapping memories rewritten as one.' }),
  remove: z
    .array(
      z.object({
        id: memoryIdSchema,
        reason: z.string().max(SHORT_TERM_MEMORY_LIMITS.reasonLength).optional(),
      })
    )
    .max(MAX_CONSOLIDATION_ENTRIES)
    .optional()
    .meta({ description: 'Memories to delete, such as ones contradicted by a newer memory.' }),
});

const ConsolidateOutputSchema = z.object({
  merged: z.number().meta({ description: 'Merges applied.' }),
  deleted: z.number().meta({ description: 'Memories deleted, merged sources included.' }),
  skipped: z.number().meta({
    description:
      'Merges dropped because a memory was missing, not this owner, used twice, or revised meanwhile.',
  }),
});

const DecayInputSchema = z.object({
  agent_ids: agentIdsSchema,
  unused_days: z.number().int().min(1).max(3650).meta({
    description:
      'Memories neither written nor recalled or shown to an agent for this many days are deleted.',
  }),
});

const DecayOutputSchema = z.object({
  expired: z.number().meta({ description: 'Expired memories deleted.' }),
  unused: z.number().meta({ description: 'Unused memories deleted.' }),
});

export type ListShortTermMemoriesStepInput = z.infer<typeof ListInputSchema>;
export type SetShortTermMemoryPromotionStepInput = z.infer<typeof SetPromotionInputSchema>;
export type ListShortTermMemoriesByOwnerStepInput = z.infer<typeof ListByOwnerInputSchema>;
export type ConsolidateShortTermMemoriesStepInput = z.infer<typeof ConsolidateInputSchema>;
export type DecayShortTermMemoriesStepInput = z.infer<typeof DecayInputSchema>;

export const listShortTermMemoriesStepCommonDefinition: CommonStepDefinition<
  typeof ListInputSchema,
  typeof ListOutputSchema
> = {
  id: ListShortTermMemoriesStepTypeId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: i18n.translate('xpack.agentBuilder.workflowSteps.listShortTermMemories.label', {
    defaultMessage: 'List short-term memories',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.listShortTermMemories.description',
    {
      defaultMessage:
        "Lists every user's short-term memories in the workflow space, for promotion to long-term memory.",
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.listShortTermMemories.documentation.details',
      {
        defaultMessage:
          'Reads short-term memories across all users, so it requires the workflow to run as an administrator. Expired memories are left out. Results are oldest first, so a memory that has waited longest is decided first.',
      }
    ),
    examples: [
      `## List pending memories of one agent
\`\`\`yaml
- name: pending
  type: ${ListShortTermMemoriesStepTypeId}
  with:
    agent_ids:
      - elastic-ai-agent
    limit: 50
\`\`\``,
    ],
  },
  inputSchema: ListInputSchema,
  outputSchema: ListOutputSchema,
};

export const setShortTermMemoryPromotionStepCommonDefinition: CommonStepDefinition<
  typeof SetPromotionInputSchema,
  typeof SetPromotionOutputSchema
> = {
  id: SetShortTermMemoryPromotionStepTypeId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: i18n.translate('xpack.agentBuilder.workflowSteps.setShortTermMemoryPromotion.label', {
    defaultMessage: 'Set short-term memory promotion',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.setShortTermMemoryPromotion.description',
    {
      defaultMessage: 'Records the promotion decision on short-term memories.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.setShortTermMemoryPromotion.documentation.details',
      {
        defaultMessage:
          'Marks short-term memories as promoted or rejected so the next promotion run skips them. Requires the workflow to run as an administrator. A memory revised by its owner since it was read keeps its pending status.',
      }
    ),
    examples: [
      `## Mark a memory as promoted
\`\`\`yaml
- name: mark_promoted
  type: ${SetShortTermMemoryPromotionStepTypeId}
  with:
    ids:
      - "{{ foreach.item.id }}"
    status: promoted
    ai_index_id: "my-ai-index"
    ki_id: "stm/{{ foreach.item.id }}"
\`\`\``,
    ],
  },
  inputSchema: SetPromotionInputSchema,
  outputSchema: SetPromotionOutputSchema,
};

export const listShortTermMemoriesByOwnerStepCommonDefinition: CommonStepDefinition<
  typeof ListByOwnerInputSchema,
  typeof ListByOwnerOutputSchema
> = {
  id: ListShortTermMemoriesByOwnerStepTypeId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: i18n.translate('xpack.agentBuilder.workflowSteps.listShortTermMemoriesByOwner.label', {
    defaultMessage: 'List short-term memories by owner',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.listShortTermMemoriesByOwner.description',
    {
      defaultMessage:
        "Lists every user's short-term memories in the workflow space, grouped by user and agent.",
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.listShortTermMemoriesByOwner.documentation.details',
      {
        defaultMessage:
          'Reads short-term memories across all users, so it requires the workflow to run as an administrator. Each entry holds one user and agent pair, so a later step can deduplicate them without mixing owners. Expired memories are left out.',
      }
    ),
    examples: [
      `## Owners whose memories changed today
\`\`\`yaml
- name: owners
  type: ${ListShortTermMemoriesByOwnerStepTypeId}
  with:
    changed_within_hours: 24
    max_owners: 20
\`\`\``,
    ],
  },
  inputSchema: ListByOwnerInputSchema,
  outputSchema: ListByOwnerOutputSchema,
};

export const consolidateShortTermMemoriesStepCommonDefinition: CommonStepDefinition<
  typeof ConsolidateInputSchema,
  typeof ConsolidateOutputSchema
> = {
  id: ConsolidateShortTermMemoriesStepTypeId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: i18n.translate('xpack.agentBuilder.workflowSteps.consolidateShortTermMemories.label', {
    defaultMessage: 'Consolidate short-term memories',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.consolidateShortTermMemories.description',
    {
      defaultMessage: "Merges and deletes short-term memories of one user's agent.",
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.consolidateShortTermMemories.documentation.details',
      {
        defaultMessage:
          'Each merge rewrites keep_id with the merged content and deletes its source_ids; each removal deletes a memory. Only memories of the given user and agent are touched, and a memory revised by its owner since it was read is left alone. Merged memories become pending for promotion again. Deletion is permanent. Requires the workflow to run as an administrator.',
      }
    ),
    examples: [
      `## Apply a deduplication plan
\`\`\`yaml
- name: consolidate
  type: ${ConsolidateShortTermMemoriesStepTypeId}
  with:
    user_id: "{{ foreach.item.user_id }}"
    agent_id: "{{ foreach.item.agent_id }}"
    merges: "\${{ steps.plan.output.content.merges }}"
    remove: "\${{ steps.plan.output.content.remove }}"
\`\`\``,
    ],
  },
  inputSchema: ConsolidateInputSchema,
  outputSchema: ConsolidateOutputSchema,
};

export const decayShortTermMemoriesStepCommonDefinition: CommonStepDefinition<
  typeof DecayInputSchema,
  typeof DecayOutputSchema
> = {
  id: DecayShortTermMemoriesStepTypeId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: i18n.translate('xpack.agentBuilder.workflowSteps.decayShortTermMemories.label', {
    defaultMessage: 'Decay short-term memories',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.decayShortTermMemories.description',
    {
      defaultMessage: 'Deletes expired short-term memories and ones that are no longer used.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.decayShortTermMemories.documentation.details',
      {
        defaultMessage:
          "Permanently deletes every user's short-term memories that are past their expiry, and expiring ones that were neither written nor recalled or shown to an agent for unused_days. Memories written without an expiry are kept. Requires the workflow to run as an administrator.",
      }
    ),
    examples: [
      `## Forget memories unused for two weeks
\`\`\`yaml
- name: decay
  type: ${DecayShortTermMemoriesStepTypeId}
  with:
    unused_days: 14
\`\`\``,
    ],
  },
  inputSchema: DecayInputSchema,
  outputSchema: DecayOutputSchema,
};
