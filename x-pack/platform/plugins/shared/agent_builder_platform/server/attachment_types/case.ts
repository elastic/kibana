/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { PLATFORM_CASE_ATTACHMENT_TYPE } from '../../common/attachments/case';

export const caseAttachmentDataSchema = z.object({
  case_id: z.string(),
  owner: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  attachmentLabel: z.string().optional(),
});

export type CaseAttachmentData = z.infer<typeof caseAttachmentDataSchema>;

const isCaseAttachmentData = (data: unknown): data is CaseAttachmentData => {
  return caseAttachmentDataSchema.safeParse(data).success;
};

export const createCaseAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: PLATFORM_CASE_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = caseAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isCaseAttachmentData(data)) {
        throw new Error(`Invalid case attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value: formatCaseData(data),
        }),
      };
    },
    getTools: () => [platformCoreTools.cases],
    getAgentDescription: () => {
      return `You are assisting with a Kibana case. Use the cases tool to load full case details, comments, and linked alerts.

CASE CONTEXT:
{caseData}

When responding:
1. Use case_id and owner from the attachment when calling the cases tool.
2. Summarize linked alerts and observables when relevant.
3. Suggest creating or updating case comments when the user asks to document findings.`;
    },
  };
};

const formatCaseData = (data: CaseAttachmentData): string => {
  const lines = [
    `case_id: ${data.case_id}`,
    `owner: ${data.owner}`,
    ...(data.title ? [`title: ${data.title}`] : []),
    ...(data.description ? [`description: ${data.description}`] : []),
  ];
  return lines.join('\n');
};
