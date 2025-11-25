/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductReferenceAttachmentData } from '@kbn/onechat-common/attachments';
import {
  AttachmentType,
  productReferenceAttachmentDataSchema,
} from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';

/**
 * Creates the definition for the `product_reference` attachment type.
 */
export const createProductReferenceAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.product_reference,
  ProductReferenceAttachmentData
> => {
  return {
    id: AttachmentType.product_reference,
    validate: (input) => {
      const parseResult = productReferenceAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatProductReferenceData(attachment.data) };
        },
      };
    },
    // TODO use real tool once https://github.com/elastic/kibana/pull/242598 merges, same in description below
    getTools: () => [`platformCoreTools.productDocumentation`],
    getAgentDescription: () => {
      const description = `You have access to a product reference that needs to be queried for documentation.

PRODUCT REFERENCE DATA:
{productReferenceData}

---
MANDATORY WORKFLOW:

1. Extract the query or topic from the product reference data above.

2. Query PRODUCT DOCUMENTATION for relevant documentation:
   Tool: ${sanitizeToolId(`platformCoreTools.productDocumentation`)}
   Parameters: {
     query: "[extracted query or topic from the product reference]",
     product: "[optional: 'kibana' | 'elasticsearch' | 'observability' | 'security']",
     max: 3
   }`;
      return description;
    },
  };
};

/**
 * Formats product reference data for display.
 *
 * @param data - The product reference attachment data containing the text
 * @returns Formatted string representation of the product reference data
 */
const formatProductReferenceData = (data: ProductReferenceAttachmentData): string => {
  return data.text;
};
