/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Generic catch-all for the remaining simple attachment rows shown in the
 * prototype: a captured file, a raw log reference, a mailbox/detection rule,
 * a screenshot, or a case note. Each just needs a title, a kind badge, and a
 * one-line subtitle (size, host, severity, timestamp, etc.) — a real
 * implementation would likely split these into distinct types with richer
 * fields (e.g. a note's body text), but this covers the dummy-data spike.
 */
export const artifactAttachmentDataSchema = z.object({
  kind: z.enum(['file', 'log', 'rule', 'screenshot', 'case_note', 'proposed_action']),
  title: z.string(),
  subtitle: z.string().optional(), // e.g. "248 KB", "okta-sso.corp.internal", "High", "14:02 UTC"
  author: z.string().optional(), // for case_note
  body: z.string().optional(), // for case_note / rule details / proposed_action description
  // proposed_action-specific fields (e.g. "Isolate fin-ws-31 — host isolation"):
  target: z.string().optional(), // e.g. "fin-ws-31"
  action_type: z.string().optional(), // e.g. "host_isolation"
  status: z.string().optional(), // e.g. "pending_review"
});

export type ArtifactAttachmentData = z.infer<typeof artifactAttachmentDataSchema>;

export const ARTIFACT_ATTACHMENT_TYPE = 'investigation.artifact';

export const createArtifactAttachmentType = (): AttachmentTypeDefinition<
  typeof ARTIFACT_ATTACHMENT_TYPE,
  ArtifactAttachmentData
> => {
  return {
    id: ARTIFACT_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = artifactAttachmentDataSchema.safeParse(input);
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
            value: [attachment.data.title, attachment.data.subtitle, attachment.data.body]
              .filter(Boolean)
              .join('\n'),
          };
        },
      };
    },
    getAgentDescription: () => {
      return `An investigation-artifact attachment is a lightweight reference to a supporting file, log,
      rule, screenshot, or case note attached during an investigation.`;
    },
    getTools: () => [],
  };
};
