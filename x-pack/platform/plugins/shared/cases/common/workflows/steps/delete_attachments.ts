/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import { MAX_ATTACHMENT_ID_LENGTH, MAX_BULK_DELETE_ATTACHMENTS } from '../../constants';
import { CasesStepCaseIdSchema } from './shared';

export const DeleteAttachmentsStepTypeId = 'cases.deleteAttachments';

const IdsSchema = z
  .array(z.string().min(1, 'ids values are required').max(MAX_ATTACHMENT_ID_LENGTH))
  .min(1)
  .max(MAX_BULK_DELETE_ATTACHMENTS);

const InputSchema = CasesStepCaseIdSchema.extend({
  ids: IdsSchema.describe(
    "The `id` of each attachment to delete, from `cases.getAllAttachments`. Use the attachment's own `id`, not its `attachmentId`, which points to an alert, event, or saved object."
  ),
  include_related: z
    .boolean()
    .optional()
    .describe(
      'Also delete the attachments that the deleted ones brought to the case, such as the alerts of an attack. Default: true.'
    ),
});

const OutputSchema = z.object({
  case_id: z.string(),
  ids: IdsSchema,
});

type DeleteAttachmentsStepInputSchema = typeof InputSchema;
type DeleteAttachmentsStepOutputSchema = typeof OutputSchema;

export type DeleteAttachmentsStepInput = z.infer<typeof InputSchema>;

export const deleteAttachmentsStepCommonDefinition: CommonStepDefinition<
  DeleteAttachmentsStepInputSchema,
  DeleteAttachmentsStepOutputSchema
> = {
  id: DeleteAttachmentsStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.DELETE_ATTACHMENTS_STEP_LABEL,
  description: i18n.DELETE_ATTACHMENTS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.DELETE_ATTACHMENTS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Delete attachments from a case
\`\`\`yaml
- name: delete_attachments
  type: ${DeleteAttachmentsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    ids:
      - "attachment-1"
      - "attachment-2"
\`\`\``,
      `## Remove the oldest attachment returned by an earlier step
\`\`\`yaml
- name: get_attachments
  type: cases.getAllAttachments
  with:
    case_id: \${{ steps.create_case.output.case.id }}

- name: delete_oldest_attachment
  type: ${DeleteAttachmentsStepTypeId}
  if: \${{ steps.get_attachments.output.attachments.length > 0 }}
  with:
    case_id: \${{ steps.create_case.output.case.id }}
    ids:
      - \${{ steps.get_attachments.output.attachments[0].id }}
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
