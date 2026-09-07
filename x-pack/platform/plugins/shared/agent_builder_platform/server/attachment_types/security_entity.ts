/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Matches the "entity" attachments shown in the investigation prototype's
 * Attachments tab / sub-flyout (e.g. FIN-DC-01): title, subtype tag,
 * confidence score, source stream, a summary, and a flat list of evidence
 * lines. This is a spike/dummy schema — not derived from a real Security
 * entity-analytics document shape.
 */
export const securityEntityAttachmentDataSchema = z.object({
  title: z.string(),
  subtype: z.string(), // e.g. "service", "host", "user" — rendered as the type tag
  confidence: z.number().min(0).max(100),
  stream_name: z.string(),
  description: z.string(),
  evidence: z.array(z.string()).default([]),
});

export type SecurityEntityAttachmentData = z.infer<typeof securityEntityAttachmentDataSchema>;

export const SECURITY_ENTITY_ATTACHMENT_TYPE = 'security.entity';

/**
 * Creates the definition for the dummy `security-entity` attachment type.
 */
export const createSecurityEntityAttachmentType = (): AttachmentTypeDefinition<
  typeof SECURITY_ENTITY_ATTACHMENT_TYPE,
  SecurityEntityAttachmentData
> => {
  return {
    id: SECURITY_ENTITY_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = securityEntityAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return {
            type: 'text',
            value: [
              `${attachment.data.title} (${attachment.data.subtype})`,
              attachment.data.description,
              ...attachment.data.evidence,
            ].join('\n'),
          };
        },
      };
    },
    getAgentDescription: () => {
      return `A security-entity attachment references an entity (host, service, user, etc.) involved in an
      investigation, with a confidence score and supporting evidence lines pulled from the source data stream.`;
    },
    getTools: () => [],
  };
};
