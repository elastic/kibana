/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { ConversationRoundStepType } from '../conversation';
import { ToolOrigin, ToolType } from '../../tools/definition';
import { ToolResultType, SupportedChartType } from '../../tools/tool_result';
import { ExecutionStatus } from '../../agents/execution_status';
import { AgentBuilderErrorCode } from '../../base/errors';
import { screenContextTimeRangeSchema } from '../../attachments/attachment_types';

const toolCallProgressSchema = z.object({
  message: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// ToolResult variants
const resourceToolResultSchema = z.object({
  type: z.literal(ToolResultType.resource),
  tool_result_id: z.string(),
  data: z.object({
    reference: z.object({ id: z.string(), index: z.string() }),
    title: z.string().optional(),
    partial: z.boolean().optional(),
    content: z.record(z.string(), z.unknown()),
  }),
});

const resourceListToolResultSchema = z.object({
  type: z.literal(ToolResultType.resourceList),
  tool_result_id: z.string(),
  data: z.object({
    resources: z.array(
      z.object({
        reference: z.object({ id: z.string(), index: z.string() }),
        title: z.string().optional(),
        partial: z.boolean().optional(),
        content: z.record(z.string(), z.unknown()),
      })
    ),
  }),
});

const fieldValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const esqlResultsToolResultSchema = z.object({
  type: z.literal(ToolResultType.esqlResults),
  tool_result_id: z.string(),
  data: z.object({
    query: z.string(),
    columns: z.array(z.custom<EsqlEsqlColumnInfo>((v) => typeof v === 'object' && v !== null)),
    values: z.array(z.array(fieldValueSchema)),
    time_range: screenContextTimeRangeSchema.optional(),
  }),
});

const dashboardToolResultSchema = z.object({
  type: z.literal(ToolResultType.dashboard),
  tool_result_id: z.string(),
  data: z.object({
    id: z.string(),
    title: z.string().optional(),
    content: z.record(z.string(), z.unknown()),
  }),
});

const queryToolResultSchema = z.object({
  type: z.literal(ToolResultType.query),
  tool_result_id: z.string(),
  data: z.object({ esql: z.string() }),
});

const visualizationToolResultSchema = z.object({
  type: z.literal(ToolResultType.visualization),
  tool_result_id: z.string(),
  data: z.object({
    esql: z.string(),
    time_range: screenContextTimeRangeSchema.optional(),
    renderer: z.enum(['lens', 'vega']).optional(),
    // visualization: Record<string, unknown> & { spec?: string }
    visualization: z.custom<Record<string, unknown> & { spec?: string }>(
      (v) => typeof v === 'object' && v !== null
    ),
    chart_type: z.enum(SupportedChartType).optional(),
    attachment_id: z.string().optional(),
    version: z.number().optional(),
  }),
});

const otherToolResultSchema = z.object({
  type: z.literal(ToolResultType.other),
  tool_result_id: z.string(),
  data: z.record(z.string(), z.unknown()), // OtherResult defaults to Record<string, unknown>
});

const errorToolResultSchema = z.object({
  type: z.literal(ToolResultType.error),
  tool_result_id: z.string(),
  data: z.object({
    message: z.string(),
    stack: z.unknown().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

const fileReferenceToolResultSchema = z.object({
  type: z.literal(ToolResultType.fileReference),
  tool_result_id: z.string(),
  data: z.object({ filepath: z.string(), comment: z.string() }),
});

const imageToolResultSchema = z.object({
  type: z.literal(ToolResultType.image),
  tool_result_id: z.string(),
  data: z.object({
    attachment_id: z.string(),
    mime_type: z.string(),
    name: z.string().optional(),
    description: z.string(),
  }),
});

// UnknownToolResult — any plugin-contributed type not in ToolResultType
// data uses Object (non-null) to match ToolResultMixin<TType, TData extends Object = Object>
const unknownToolResultSchema = z.object({
  tool_result_id: z.string(),
  type: z.string(),
  data: z.custom<Object>((v) => v !== null && v !== undefined),
});

// Known variants first; unknownToolResultSchema catch-all last (z.union tries in order)
const toolResultSchema = z.union([
  resourceToolResultSchema,
  resourceListToolResultSchema,
  esqlResultsToolResultSchema,
  dashboardToolResultSchema,
  queryToolResultSchema,
  visualizationToolResultSchema,
  otherToolResultSchema,
  errorToolResultSchema,
  fileReferenceToolResultSchema,
  imageToolResultSchema,
  unknownToolResultSchema,
]);

const toolCallStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.toolCall),
  tool_call_id: z.string(),
  tool_id: z.string(),
  params: z.record(z.string(), z.unknown()),
  progression: z.array(toolCallProgressSchema).optional(),
  results: z.array(toolResultSchema),
  tool_call_group_id: z.string().optional(),
  tool_origin: z.enum(ToolOrigin).optional(),
  tool_type: z.enum(ToolType).optional(),
});

const reasoningStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.reasoning),
  reasoning: z.string(),
  transient: z.boolean().optional(),
  tool_call_id: z.string().optional(),
  tool_call_group_id: z.string().optional(),
});

const compactionStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.compaction),
  summarized_round_count: z.number(),
  token_count_before: z.number(),
  token_count_after: z.number(),
});

const backgroundAgentCompleteStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.backgroundAgentComplete),
  execution_id: z.string(),
  status: z.enum(ExecutionStatus),
  response: z
    .object({
      message: z.string(),
      structured_output: z.custom<object>((v) => typeof v === 'object' && v !== null).optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.enum(AgentBuilderErrorCode),
      message: z.string(),
      meta: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  completed_at: z
    .object({ round_id: z.string(), tool_call_group_id: z.string().optional() })
    .optional(),
});

const updateTodosStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.updateTodos),
  todos: z.array(
    z.object({
      content: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']), // TodoStatus
    })
  ),
  carried_over: z.boolean().optional(),
});

const askUserQuestionStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.askUserQuestion),
  prompt_id: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.object({ label: z.string(), description: z.string().optional() })),
      multi_select: z.boolean(),
    })
  ),
  answers: z
    .array(
      z.object({
        choice: z.array(z.number()).optional(),
        custom: z.string().optional(),
        skipped: z.boolean().optional(),
      })
    )
    .optional(),
});

const relevantSkillsStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.relevantSkills),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      path: z.string(),
      description: z.string(),
      relevance_note: z.string().optional(),
    })
  ),
  source: z.enum(['implicit', 'explicit']),
});

const subagentRosterUpdatedStepSchema = z.object({
  type: z.literal(ConversationRoundStepType.subagentRosterUpdated),
  roster: z.array(
    z.object({
      name: z.string(),
      purpose: z.string().optional(),
      conversation_id: z.string(),
    })
  ),
});

export const conversationRoundStepSchema = z.discriminatedUnion('type', [
  toolCallStepSchema,
  reasoningStepSchema,
  compactionStepSchema,
  backgroundAgentCompleteStepSchema,
  updateTodosStepSchema,
  askUserQuestionStepSchema,
  relevantSkillsStepSchema,
  subagentRosterUpdatedStepSchema,
]);
