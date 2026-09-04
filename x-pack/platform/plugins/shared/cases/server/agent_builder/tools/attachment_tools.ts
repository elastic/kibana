/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import { addCommentStepCommonDefinition } from '../../../common/workflows/steps/add_comment';
import { addAlertsStepCommonDefinition } from '../../../common/workflows/steps/add_alerts';
import { addEventsStepCommonDefinition } from '../../../common/workflows/steps/add_events';
import { addCommentStepDefinition } from '../../workflows/steps/add_comment';
import { addAlertsStepDefinition } from '../../workflows/steps/add_alerts';
import { addEventsStepDefinition } from '../../workflows/steps/add_events';
import { getAllAttachmentsStepDefinition } from '../../workflows/steps/get_all_attachments';
import { addAttachmentsStepDefinition } from '../../workflows/steps/add_attachments';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../common/constants';
import type { CasesClient } from '../../client';
import { invokeStepHandler } from '../utils/invoke_step';
import {
  CASES_TOOL_TEXT_INSTRUCTION,
  CASES_SOLUTION_CONTEXT_INSTRUCTION,
} from '../utils/tool_instructions';
import { emitFromStepResult, injectAttachmentIds } from '../attachments/emit_attachments';

type GetCasesClientFn = (request: KibanaRequest) => Promise<CasesClient>;

/**
 * The `type` values `add_attachments` accepts are whatever authorable
 * attachment types the registry holds — not just comments and alerts. Listing
 * them in the schema description stops the model from assuming the two example
 * shapes below are the only supported types.
 */
const describeAttachmentsField = (authorableTypeIds: string[]): string => {
  const lines = [
    'For add_attachments: generic bulk attachment payloads (NOT limited to comments and alerts).',
  ];
  if (authorableTypeIds.length > 0) {
    lines.push(
      `Supported \`type\` values: ${authorableTypeIds.join(
        ', '
      )} (plus any solution-registered types).`
    );
  }
  lines.push(
    'Each item is discriminated by `type`; never set `owner` (it is derived from the case). Common shapes:',
    '- comment: { type: "comment", data: { content: string } }',
    '- alert: { type: "stack.alert", attachmentId: "<alertId>", metadata: { index: string, rule?: { id: string, name?: string } } }',
    '- saved object (e.g. dashboard, discoverSession, lens, map): { type, attachmentId: "<savedObjectId>", metadata: { title: string, soType: string } }'
  );
  return lines.join('\n');
};

const buildAttachmentsSchema = (authorableTypeIds: string[]) =>
  z.object({
    mode: z
      .enum(['add_comment', 'add_alerts', 'add_events', 'add_attachments', 'get_all'])
      .describe(
        'Required fields per mode:\n' +
          '- add_comment: case_id, comment\n' +
          '- add_alerts: case_id, alerts ({alertId, index, rule?}[])\n' +
          '- add_events: case_id, events ({eventId, index}[])\n' +
          '- add_attachments: case_id, attachments (generic bulk; supports comments, alerts, and saved-object types like dashboards — see the `attachments` field)\n' +
          '- get_all: case_id'
      ),
    ...addCommentStepCommonDefinition.inputSchema.partial().shape,
    ...addAlertsStepCommonDefinition.inputSchema.partial().shape,
    ...addEventsStepCommonDefinition.inputSchema.partial().shape,
    // get_all only needs case_id — already covered above
    attachments: z
      .array(z.object({ type: z.string() }).loose())
      .min(1)
      .max(MAX_BULK_CREATE_ATTACHMENTS)
      .optional()
      .describe(describeAttachmentsField(authorableTypeIds)),
  });

// Static schema used only for typing; the tool builds a schema with the
// registry-derived type list at construction time (same shape, so the inferred
// type is identical).
const attachmentsSchema = buildAttachmentsSchema([]);

/**
 * Authorable attachment type IDs registered so far — those exposing a
 * `workflowSchema`/`schema` `ZodObject` (mirrors `selectAuthorableAttachmentSchemas`).
 * Built-in types are registered before this tool, so the list covers them.
 */
const getAuthorableTypeIds = (registry: UnifiedAttachmentTypeRegistry): string[] =>
  registry
    .list()
    .filter(({ workflowSchema, schema }) => (workflowSchema ?? schema) instanceof z.ZodObject)
    .map(({ id }) => id)
    .sort();

/**
 * @deprecated Use `getAttachmentsTool` (read) and `manageAttachmentsTool` (write) instead.
 * Retained for backward compatibility with agents that reference the old tool ID.
 */
export const attachmentsTool = (
  getCasesClientFn: GetCasesClientFn,
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  isCasesAttachmentsEnabled: boolean
): BuiltinToolDefinition<typeof attachmentsSchema> => {
  const addCommentStepDef = addCommentStepDefinition(getCasesClientFn);
  const addAlertsStepDef = addAlertsStepDefinition(getCasesClientFn);
  const addEventsStepDef = addEventsStepDefinition(getCasesClientFn);
  const getAllAttachmentsStepDef = getAllAttachmentsStepDefinition(getCasesClientFn);

  // Built lazily on first use: the discriminated union must snapshot the
  // registry after solution plugins have registered their attachment types
  // (post-start), which is guaranteed by the time a handler runs.
  let addAttachmentsStepDef: ReturnType<typeof addAttachmentsStepDefinition>;
  const getAddAttachmentsStepDef = () => {
    if (addAttachmentsStepDef === undefined) {
      addAttachmentsStepDef = addAttachmentsStepDefinition(
        unifiedAttachmentTypeRegistry,
        getCasesClientFn
      );
    }
    return addAttachmentsStepDef;
  };

  const schema = buildAttachmentsSchema(
    getAuthorableTypeIds(unifiedAttachmentTypeRegistry)
  ) as typeof attachmentsSchema;

  return {
    id: platformCoreCasesTools.attachments,
    type: ToolType.builtin,
    description: `DEPRECATED — this tool will be removed in a future release. Use these tools instead:
- To retrieve attachments for a case: \`${platformCoreCasesTools.getAttachments}\`
- To add attachments (comments, alerts, events, or other): \`${platformCoreCasesTools.manageAttachments}\`

This tool still works but combines read and write operations. Prefer the dedicated tools above.

Modes: \`add_comment\`, \`add_alerts\`, \`add_events\`, \`add_attachments\`, \`get_all\`. See \`mode\` field for required inputs.

${CASES_SOLUTION_CONTEXT_INSTRUCTION}${CASES_TOOL_TEXT_INSTRUCTION}`,
    annotations: {
      title: 'Case Attachments (Deprecated)',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema,
    tags: ['cases'],
    handler: async (args, toolContext) => {
      const { mode, case_id, attachments, ...rest } = args;

      const runStep = async () => {
        switch (mode) {
          case 'add_comment':
            return invokeStepHandler(addCommentStepDef, { case_id, ...rest }, toolContext);
          case 'add_alerts':
            return invokeStepHandler(addAlertsStepDef, { case_id, ...rest }, toolContext);
          case 'add_events':
            return invokeStepHandler(addEventsStepDef, { case_id, ...rest }, toolContext);
          case 'add_attachments': {
            if (!isCasesAttachmentsEnabled) {
              throw new Error(
                'Adding attachments is disabled. Enable `xpack.cases.attachments` to use `add_attachments`.'
              );
            }
            const stepDef = getAddAttachmentsStepDef();
            if (!stepDef) {
              throw new Error('No authorable attachment types are registered.');
            }
            return invokeStepHandler(stepDef, { case_id, attachments }, toolContext);
          }
          case 'get_all':
            return invokeStepHandler(getAllAttachmentsStepDef, { case_id }, toolContext);
          default: {
            const _exhaustive: never = mode;
            throw new Error(`Unknown attachments mode: ${_exhaustive}`);
          }
        }
      };

      const result = await runStep();
      if (mode !== 'get_all') {
        const attachmentIds = await emitFromStepResult(toolContext.attachments, result);
        return injectAttachmentIds(result, attachmentIds);
      }
      return result;
    },
  };
};
