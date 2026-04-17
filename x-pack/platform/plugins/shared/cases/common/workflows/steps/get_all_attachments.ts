/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  ActionsCommentResponseProperties,
  AlertCommentResponseProperties,
  EventCommentResponseProperties,
  UserCommentResponseProperties,
} from '../../bundled-types.gen';
import * as i18n from '../translations';
import { MAX_DOCS_PER_PAGE } from '../../constants';
import { CasesStepCaseIdSchema } from './shared';

export const GetAllAttachmentsStepTypeId = 'cases.getAllAttachments';

const AttachmentSchema = z.discriminatedUnion('type', [
  ActionsCommentResponseProperties,
  AlertCommentResponseProperties,
  EventCommentResponseProperties,
  UserCommentResponseProperties,
]);

const InputSchema = CasesStepCaseIdSchema;

const OutputSchema = z.object({
  attachments: z.array(AttachmentSchema).max(MAX_DOCS_PER_PAGE),
});

type GetAllAttachmentsStepInputSchema = typeof InputSchema;
type GetAllAttachmentsStepOutputSchema = typeof OutputSchema;

export type GetAllAttachmentsStepInput = z.infer<typeof InputSchema>;

export const getAllAttachmentsStepCommonDefinition: CommonStepDefinition<
  GetAllAttachmentsStepInputSchema,
  GetAllAttachmentsStepOutputSchema
> = {
  id: GetAllAttachmentsStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.GET_ALL_ATTACHMENTS_STEP_LABEL,
  description: i18n.GET_ALL_ATTACHMENTS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.GET_ALL_ATTACHMENTS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Retrieve all attachments for a case
\`\`\`yaml
- name: get_all_attachments
  type: ${GetAllAttachmentsStepTypeId}
  with:
    case_id: "abc-123-def-456"
\`\`\``,
      `## Inspect evidence before closing
\`\`\`yaml
- name: get_evidence
  type: ${GetAllAttachmentsStepTypeId}
  with:
    case_id: \${{ steps.create_case.output.case.id }}

- name: close_case
  type: cases.closeCase
  if: \${{ steps.get_evidence.output.attachments.length > 0 }}
  with:
    case_id: \${{ steps.create_case.output.case.id }}
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
