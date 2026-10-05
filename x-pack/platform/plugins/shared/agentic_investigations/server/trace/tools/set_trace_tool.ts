/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import {
  investigationEvidenceSchema,
  MAX_EVIDENCE_SHORT_TEXT_LENGTH,
  MAX_EVIDENCE_TEXT_LENGTH,
} from '../../../common/evidence';
import { MAX_TRACE_STEPS, SET_TRACE_TOOL_ID } from '../../../common/trace/constants';
import { traceStepTypeSchema } from '../../../common/trace/trace';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { TraceService } from '../services/trace_service';

const setTraceStepSchema = z.object({
  type: traceStepTypeSchema.describe(
    'Decision tree node type: "symptom" (what triggered the investigation, the first step), "evidence_gatherer" (a check that collected data), "decision" (a question the data answered, choosing the next branch), or "end" (where the route stopped: the root cause, or a dead end).'
  ),
  label: z
    .string()
    .min(1)
    .max(MAX_EVIDENCE_SHORT_TEXT_LENGTH)
    .describe('What was investigated, or the question decided, in one line.'),
  method: z
    .string()
    .max(MAX_EVIDENCE_TEXT_LENGTH)
    .optional()
    .describe(
      'How it was investigated: the ES|QL query, command, or source read. Markdown; put queries in code blocks.'
    ),
  finding: z
    .string()
    .max(MAX_EVIDENCE_TEXT_LENGTH)
    .optional()
    .describe('What it showed, with the numbers. Markdown.'),
  outcome: z
    .string()
    .max(MAX_EVIDENCE_SHORT_TEXT_LENGTH)
    .optional()
    .describe(
      'The branch it led to, like a decision tree edge label (for example "errors only on v2").'
    ),
  decision_tree_node: z
    .string()
    .max(128)
    .optional()
    .describe('The id of the node in the decision tree that guided this step, when one did.'),
  evidence: investigationEvidenceSchema
    .optional()
    .describe('A chart of the signal the step looked at, when it is worth showing.'),
});

export const setTraceToolSchema = z.object({
  steps: z
    .array(setTraceStepSchema)
    .max(MAX_TRACE_STEPS)
    .describe('Every step taken so far, in the order taken, including dead ends.'),
  decision_tree: z
    .string()
    .max(MAX_EVIDENCE_SHORT_TEXT_LENGTH)
    .optional()
    .describe(
      'The decision tree file the investigation followed (for example "checkout-latency.md"), when one matched.'
    ),
});

export type SetTraceToolParams = z.infer<typeof setTraceToolSchema>;

const DESCRIPTION =
  'Record the investigation trace: the route the investigation actually took, step by step (what was investigated, how, what it found, and which branch that led to), in decision tree node types. ' +
  'This is a snapshot, not a diff: every call must include every step so far, in order, and replaces the stored trace. ' +
  'Call it after each step that changed direction, and once more at the end. It does not end the investigation; keep working after calling it.';

export const REMOVED_TRACE_ATTACHMENT_NOTE =
  'The user removed the investigation trace attachment from this conversation. The trace was recorded but is not shown in the conversation.';

/** `investigations.set_trace`: the agent's write path for `investigation_trace`. */
export const createSetTraceTool = ({
  getTraceService,
  resolveUser,
  privileges,
  logger,
}: {
  getTraceService: () => TraceService;
  resolveUser: ResolveUser;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SET_TRACE_TOOL_ID,
    description: DESCRIPTION,
    schema: setTraceToolSchema,
    annotations: {
      title: 'Set Investigation Trace',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async ({ steps, decision_tree: decisionTree }, { context, conversationId }) => {
      const user = await resolveUser(context.request);
      const { document, attachment } = await getTraceService().setFromTool({
        context,
        conversationId,
        steps,
        decisionTree,
        user,
      });

      return {
        results: [
          createOtherResult({
            acknowledged: true,
            attachment_id: document.id,
            ...(attachment === 'removed_by_user' && { warning: REMOVED_TRACE_ATTACHMENT_NOTE }),
          }),
        ],
      };
    },
  });
