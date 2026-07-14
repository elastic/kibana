/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { AttachmentsSetup } from '@kbn/agent-builder-server';

/**
 * Type id of the entity-centric lab flyout's "Add to chat" attachment.
 *
 * Kept in lockstep with the client-side constant of the same name in
 * `@kbn/entity-centric-lab-flyout` — we duplicate the literal here rather
 * than importing it because `@kbn/entity-centric-lab-flyout` is a
 * `shared-browser` package and cannot be referenced from server code.
 * If the constant changes on one side, update it on the other.
 */
export const ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE = 'entity_centric_lab_entity_context' as const;

const entityCentricLabAttachmentDataSchema = z.looseObject({
  entity_name: z.string(),
  entity_display_name: z.string(),
  entity_type: z.string().optional(),
  entity_kind: z.string().optional(),
  entity_health: z.enum(['healthy', 'atRisk', 'unhealthy', 'unknown']).optional(),
  active_tab: z.string(),
  url: z.string(),
  ai_summary_headline: z.string().optional(),
  ai_summary_issues: z.array(z.string()).optional(),
  ai_summary_next_steps: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  active_alerts_count: z.number().optional(),
  open_security_issues_count: z.number().optional(),
  risk_score: z.number().optional(),
  risk_level: z.string().optional(),
});

type EntityCentricLabAttachmentData = z.infer<typeof entityCentricLabAttachmentDataSchema>;

const HEALTH_TO_LABEL: Record<
  NonNullable<EntityCentricLabAttachmentData['entity_health']>,
  string
> = {
  healthy: 'Healthy',
  atRisk: 'At risk',
  unhealthy: 'Unhealthy',
  unknown: 'Unknown',
};

const createEntityCentricLabAttachmentType = (): AttachmentTypeDefinition<
  typeof ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
  EntityCentricLabAttachmentData
> => {
  return {
    id: ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = entityCentricLabAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text' as const,
        value: formatEntityCentricLabAttachment(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      `An entity-centric lab attachment is a snapshot of what the user was looking at in the entity flyout: entity name, kind, current health, AI-generated headline / issues / next steps, tags, active alerts and open security issues, plus the tab they were on. Use it as authoritative user-visible context when answering questions about the referenced entity.`,
    getTools: () => [],
  };
};

const formatEntityCentricLabAttachment = (data: EntityCentricLabAttachmentData): string => {
  const lines: string[] = [];
  lines.push(`Entity: ${data.entity_display_name || data.entity_name}`);
  if (data.entity_kind) {
    lines.push(`Kind: ${data.entity_kind}`);
  }
  if (data.entity_type) {
    lines.push(`Type: ${data.entity_type}`);
  }
  if (data.entity_health) {
    lines.push(`Health: ${HEALTH_TO_LABEL[data.entity_health]}`);
  }
  lines.push(`Active tab: ${data.active_tab}`);
  if (data.url) {
    lines.push(`Url: ${data.url}`);
  }
  if (typeof data.active_alerts_count === 'number') {
    lines.push(`Active alerts: ${data.active_alerts_count}`);
  }
  if (typeof data.open_security_issues_count === 'number') {
    lines.push(`Open security issues: ${data.open_security_issues_count}`);
  }
  if (typeof data.risk_score === 'number' && data.risk_level) {
    lines.push(`Risk: ${data.risk_level} (${data.risk_score})`);
  }
  if (data.tags && data.tags.length > 0) {
    lines.push(`Tags: ${data.tags.join(', ')}`);
  }
  if (data.ai_summary_headline) {
    lines.push(`AI headline: ${data.ai_summary_headline}`);
  }
  if (data.ai_summary_issues && data.ai_summary_issues.length > 0) {
    lines.push('Current issues:');
    for (const issue of data.ai_summary_issues) {
      lines.push(`- ${issue}`);
    }
  }
  if (data.ai_summary_next_steps && data.ai_summary_next_steps.length > 0) {
    lines.push('Suggested next steps:');
    for (const step of data.ai_summary_next_steps) {
      lines.push(`- ${step}`);
    }
  }
  return lines.join('\n');
};

/**
 * Registers the entity-centric lab attachment type with the Agent Builder
 * server-side registry. Called from Streams' `setup()` — must be paired
 * with the browser-side UI registration in `@kbn/entity-centric-lab-flyout`
 * or the composer pill will fall back to a generic "Text" label.
 *
 * The underlying registry throws on duplicate ids, so we swallow that
 * specific case defensively: it should never happen in practice because
 * only the Streams server plugin registers this type today, but if a
 * future consumer (e.g. Discover server plugin) also calls this we don't
 * want the second registration to bring the plugin down at boot.
 */
export const registerEntityCentricLabAttachmentType = (attachments: AttachmentsSetup): void => {
  try {
    attachments.registerType(createEntityCentricLabAttachmentType() as AttachmentTypeDefinition);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('already registered')) {
      throw error;
    }
  }
};
