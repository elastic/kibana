/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Matches the "Detection/Anomaly" and "Alert/Anomaly" attachments shown in the
 * investigation prototype's Attachments tab / sub-flyout (e.g. "Impossible
 * travel — two sign-ins, 40 min apart"): a category + kind badge pair,
 * a monospace finding snippet, why-this-matters, what-happened, associated
 * entities, a trend chart, an ES|QL query, and sample logs.
 */
export const securityFindingAttachmentDataSchema = z.object({
  title: z.string(),
  occurred_at: z.string().optional(), // e.g. "Jul 13, 2026 @ 13:41:00"
  category: z.string(), // "Detection" | "Alert"
  kind: z.string(), // "Anomaly" | "Elevated rate"
  source: z.string(), // e.g. "Discover · sign-in logs"
  status_pill: z.string(), // e.g. "both sessions live", "token still valid"
  finding_snippet: z.string(), // monospace block under "Finding"
  why_this_matters: z.string(),
  what_happened: z.string(),
  associated_entities: z.array(z.string()).default([]), // titles of security-entity attachments
  trend_title: z.string().optional(), // e.g. "[Logs] Sign-in distance anomaly"
  trend_data: z.array(z.object({ x: z.string(), y: z.number() })).default([]),
  esql_query: z.string().optional(),
  sample_logs: z.array(z.object({ timestamp: z.string(), message: z.string() })).default([]),
});

export type SecurityFindingAttachmentData = z.infer<typeof securityFindingAttachmentDataSchema>;

export const SECURITY_FINDING_ATTACHMENT_TYPE = 'security.detection';

export const createSecurityFindingAttachmentType = (): AttachmentTypeDefinition<
  typeof SECURITY_FINDING_ATTACHMENT_TYPE,
  SecurityFindingAttachmentData
> => {
  return {
    id: SECURITY_FINDING_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = securityFindingAttachmentDataSchema.safeParse(input);
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
              `${attachment.data.title} (${attachment.data.category} · ${attachment.data.kind})`,
              attachment.data.what_happened,
              `Why this matters: ${attachment.data.why_this_matters}`,
            ].join('\n'),
          };
        },
      };
    },
    getAgentDescription: () => {
      return `A security-detection attachment references a single detection/anomaly/alert finding surfaced
      during an investigation, with a trend chart, an ES|QL query used to derive it, and sample supporting logs.`;
    },
    getTools: () => [],
  };
};
