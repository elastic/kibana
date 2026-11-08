/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  RULE_ATTACHMENT_TYPE,
  type ActionPolicyAttachmentData,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from './constants';
import { getLatestAttachmentData } from './evaluators/expected_attachment';

export interface WorkflowYamlDraft {
  workflowId?: string;
  yaml?: string;
}

export interface NotificationDrafts {
  rule?: RuleAttachmentData;
  workflow?: WorkflowYamlDraft;
  actionPolicy?: ActionPolicyAttachmentData;
}

/** Latest rule, notification workflow, and action policy drafts in the conversation. */
export const getNotificationDrafts = (attachments: VersionedAttachment[]): NotificationDrafts => ({
  rule: getLatestAttachmentData<RuleAttachmentData>(attachments, RULE_ATTACHMENT_TYPE),
  workflow: getLatestAttachmentData<WorkflowYamlDraft>(attachments, WORKFLOW_YAML_ATTACHMENT_TYPE),
  actionPolicy: getLatestAttachmentData<ActionPolicyAttachmentData>(
    attachments,
    ACTION_POLICY_ATTACHMENT_TYPE
  ),
});

/** Throws one failure listing every missing rule id, workflow id, workflow YAML, or action policy. */
export const assertNotificationDraftsComposed = (
  { rule, workflow, actionPolicy }: NotificationDrafts,
  { requireWorkflowYaml }: { requireWorkflowYaml: boolean }
): void => {
  const missing = [
    typeof rule?.id === 'string' ? null : 'rule (with id)',
    typeof workflow?.workflowId === 'string' ? null : 'workflow (with workflowId)',
    !requireWorkflowYaml || typeof workflow?.yaml === 'string' ? null : 'workflow YAML',
    actionPolicy === undefined ? 'action policy' : null,
  ].filter((label): label is string => label !== null);
  if (missing.length > 0) {
    throw new Error(`Missing composed drafts: ${missing.join(', ')}`);
  }
};

/** Returns `value`, or throws a check failure naming the missing draft. */
export const requireDraft = <T>(value: T | undefined, label: string): T => {
  if (value === undefined) {
    throw new Error(`No ${label} attachment was composed`);
  }
  return value;
};
