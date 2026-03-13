/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import { mermaidAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import { MERMAID_CASE_ATTACHMENT_TYPE } from '../../common/constants/cases';

export const registerCasesMermaidAttachment = (cases: CasesServerSetup, logger: Logger) => {
  try {
    cases.attachmentFramework.registerUnified({
      id: MERMAID_CASE_ATTACHMENT_TYPE,
      schemaValidator: (data: unknown) => {
        const result = mermaidAttachmentDataSchema.safeParse(data);
        if (!result.success) {
          throw new Error(`Invalid mermaid attachment data: ${result.error.message}`);
        }
      },
    });
  } catch (error) {
    logger.warn(`Failed to register mermaid cases attachment: ${error}`);
  }
};
