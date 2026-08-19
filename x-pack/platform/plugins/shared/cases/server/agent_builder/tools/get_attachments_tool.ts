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
import { getAllAttachmentsStepDefinition } from '../../workflows/steps/get_all_attachments';
import type { CasesClient } from '../../client';
import { invokeStepHandler } from '../utils/invoke_step';
import {
  CASES_TOOL_TEXT_INSTRUCTION,
  CASES_SOLUTION_CONTEXT_INSTRUCTION,
} from '../utils/tool_instructions';

type GetCasesClientFn = (request: KibanaRequest) => Promise<CasesClient>;

const getAttachmentsSchema = z.object({
  case_id: z.string().min(1).describe('The case ID to retrieve attachments for.'),
});

export const getAttachmentsTool = (
  getCasesClientFn: GetCasesClientFn
): BuiltinToolDefinition<typeof getAttachmentsSchema> => {
  const getAllAttachmentsStepDef = getAllAttachmentsStepDefinition(getCasesClientFn);

  return {
    id: platformCoreCasesTools.getAttachments,
    type: ToolType.builtin,
    description: `Retrieve all comments, alerts, and events attached to a case.\n\n${CASES_SOLUTION_CONTEXT_INSTRUCTION}${CASES_TOOL_TEXT_INSTRUCTION}`,
    annotations: {
      title: 'Get Case Attachments',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: getAttachmentsSchema,
    tags: ['cases'],
    handler: async (args, toolContext) => {
      const { case_id } = args;
      return invokeStepHandler(getAllAttachmentsStepDef, { case_id }, toolContext);
    },
  };
};
