/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from "@kbn/agent-builder-common/attachments";
import { IndexSummaryAttachmentData, indexSummaryAttachmentDataSchema } from "@kbn/agent-builder-common/attachments/attachment_types";
import { AttachmentTypeDefinition } from "@kbn/agent-builder-server/attachments";


export const createIndexSummarizationAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.index,
  IndexSummaryAttachmentData
> => {
    return {
        id: AttachmentType.index,
        isReadonly: true,
        validate: (input) => {
            const parseResult = indexSummaryAttachmentDataSchema.safeParse(input);
            if (parseResult.success) {
                return { valid: true, data: parseResult.data };
            }
            return { valid: false, error: parseResult.error.message };
        },
        format: (attachment) => {
            const {
                index_name,
                summary_text,
                field_types,
            } = attachment.data;

            return {
                getRepresentation: () => {
                    return { type: 'text', value: `summary of index ${index_name}: ${summary_text}\nWith fields: ${field_types}` };
                },
            }
        },
        getTools: () => [],
        getAgentDescription: () => {
            return 'A index summarization attachment represents a summary that was automatically generated that describes the structure and content of an index or index pattern.';
        },
    };
}
