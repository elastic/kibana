/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { RuleOperationValidationError } from './operations';

type AttachmentStore = ToolHandlerContext['attachments'];

export interface RuleAttachmentDraft {
  readonly attachmentId: string;
  readonly isNew: boolean;
  readonly data: Partial<RuleAttachmentData>;
  /** The persisted rule's id, when the attachment is linked to a saved rule. */
  readonly origin?: string;
}

/**
 * Loads the latest version of a rule attachment. Without an id, or with one the
 * conversation doesn't hold yet, starts a new draft under that id. Throws when the
 * id belongs to an attachment of another type.
 */
export const loadRuleAttachment = (
  attachments: AttachmentStore,
  attachmentId?: string
): RuleAttachmentDraft => {
  const record = attachmentId ? attachments.getAttachmentRecord(attachmentId) : undefined;
  if (!record) {
    return { attachmentId: attachmentId ?? uuidv4(), isNew: true, data: {} };
  }
  if (record.type !== RULE_ATTACHMENT_TYPE) {
    throw new RuleOperationValidationError(
      `Attachment "${record.id}" is a "${record.type}" attachment, not a rule attachment.`
    );
  }

  const data: Partial<RuleAttachmentData> = record.versions.at(-1)?.data ?? {};
  return { attachmentId: record.id, isNew: false, data, origin: record.origin };
};

/**
 * Gives a new rule a stable id up front so that action policies can reference
 * `rule.id` before the rule is saved; the UI upserts with it through
 * `PUT /api/alerting/v2/rules/{id}`.
 */
export const assignRuleId = (
  { isNew }: Pick<RuleAttachmentDraft, 'isNew'>,
  data: Partial<RuleAttachmentData>
): Partial<RuleAttachmentData> => (isNew && !data.id ? { ...data, id: uuidv4() } : data);

/** Adds or updates the rule attachment. */
export const saveRuleAttachment = async (
  attachments: AttachmentStore,
  { attachmentId, isNew }: Pick<RuleAttachmentDraft, 'attachmentId' | 'isNew'>,
  data: Partial<RuleAttachmentData>
): Promise<VersionedAttachment> => {
  const description = `Rule: ${data.metadata?.name ?? attachmentId}`;

  const attachment = isNew
    ? await attachments.add({ id: attachmentId, type: RULE_ATTACHMENT_TYPE, description, data })
    : await attachments.update(attachmentId, { data, description });

  if (!attachment) {
    throw new Error(`Failed to persist rule attachment "${attachmentId}".`);
  }

  return attachment;
};

/** The rule fields echoed back to the agent after a tool changes the attachment. */
export const summarizeRuleAttachment = (
  attachment: VersionedAttachment,
  data: Partial<RuleAttachmentData>
) => {
  const dashboards = (data.artifacts ?? [])
    .filter((artifact) => artifact.type === DASHBOARD_ARTIFACT_TYPE)
    .map((artifact) => artifact.data.dashboard_id)
    .filter((dashboardId): dashboardId is string => typeof dashboardId === 'string');
  const runbookAttached = (data.artifacts ?? []).some(
    (artifact) => artifact.type === RUNBOOK_ARTIFACT_TYPE
  );

  return {
    version: attachment.current_version ?? 1,
    ruleAttachment: {
      id: attachment.id,
      ruleId: data.id,
      name: data.metadata?.name,
      kind: data.kind,
      ...(data.metadata?.builder ? { builder: data.metadata.builder.type } : {}),
      schedule: data.schedule,
      query: data.query,
      time_field: data.time_field,
      recovery: data.recovery,
      no_data: data.no_data,
      ...(dashboards.length > 0 ? { dashboards } : {}),
      ...(runbookAttached ? { runbookAttached: true } : {}),
    },
  };
};
