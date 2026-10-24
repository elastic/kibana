/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ActionPolicyAttachmentData, RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { ACTION_POLICY_ATTACHMENT_TYPE, RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';

export interface WorkflowYamlAttachmentData {
  yaml: string;
  workflowId?: string;
  name?: string;
}

export interface AttachmentEntry<TData> {
  /**
   * Conversation-scoped attachment id, used for `get`/`getDraft` and `<render_attachment id>`.
   * Stable across saves and never equal to the persisted object id (see `origin`).
   */
  id: string;
  type: string;
  version: number;
  description?: string;
  /**
   * Id of the persisted object backing this attachment (e.g. the rule, action policy, or
   * workflow id); `undefined` while the attachment is an unsaved draft. For rules and action
   * policies it matches `data.id`; for workflows it matches `data.workflowId`.
   */
  origin?: string;
  data: TData;
}

export interface AttachmentDraft<TData> {
  /** Conversation-scoped attachment id; see {@link AttachmentEntry.id}. */
  attachmentId: string;
  isNew: boolean;
  /** Persisted object id, if the attachment has been saved; see {@link AttachmentEntry.origin}. */
  origin?: string;
  data: Partial<TData>;
}

export interface TypedAttachmentClient<TData> {
  readonly type: string;
  /** Returns the latest version of an active or inactive attachment, or `undefined` if it is missing or of another type. */
  get(attachmentId: string): AttachmentEntry<TData> | undefined;
  /** Returns the latest version of every active attachment of this type. */
  list(): Array<AttachmentEntry<TData>>;
  /** Loads an attachment for editing; an unknown or omitted id yields a new, empty draft. */
  getDraft(attachmentId?: string): AttachmentDraft<TData>;
  /** Adds or updates the draft's attachment with `data`. */
  saveDraft(draft: AttachmentDraft<TData>, data: Partial<TData>): Promise<VersionedAttachment>;
}

export interface TypedAttachmentClientOptions<TData> {
  /** Human-readable type name used in the saved description (`<label>: <name>`) and errors. */
  label?: string;
  getName?: (data: Partial<TData>) => string | undefined;
}

export interface AttachmentsClient {
  rules: TypedAttachmentClient<RuleAttachmentData>;
  actionPolicies: TypedAttachmentClient<ActionPolicyAttachmentData>;
  workflows: TypedAttachmentClient<WorkflowYamlAttachmentData>;
  /** Creates a client for any other registered attachment type. */
  ofType<TData>(
    type: string,
    options?: TypedAttachmentClientOptions<TData>
  ): TypedAttachmentClient<TData>;
}

const toEntry = <TData>(record: VersionedAttachment): AttachmentEntry<TData> => {
  const latest = record.versions.at(-1);
  return {
    id: record.id,
    type: record.type,
    version: latest?.version ?? record.current_version,
    description: record.description,
    origin: record.origin,
    data: latest?.data as TData,
  };
};

const createTypedAttachmentClient = <TData>(
  attachments: AttachmentStateManager,
  type: string,
  { label, getName }: TypedAttachmentClientOptions<TData> = {}
): TypedAttachmentClient<TData> => ({
  type,
  get: (attachmentId) => {
    const record = attachments.getAttachmentRecord(attachmentId);
    return record?.type === type ? toEntry<TData>(record) : undefined;
  },
  list: () =>
    attachments
      .getActive()
      .filter((record) => record.type === type)
      .map((record) => toEntry<TData>(record)),
  getDraft: (attachmentId) => {
    const record = attachmentId ? attachments.getAttachmentRecord(attachmentId) : undefined;
    if (record && record.type !== type) {
      throw new Error(
        `Attachment "${attachmentId}" is of type "${record.type}", expected "${type}".`
      );
    }
    return {
      attachmentId: attachmentId ?? uuidv4(),
      isNew: !record,
      origin: record?.origin,
      data: (record?.versions.at(-1)?.data as Partial<TData> | undefined) ?? {},
    };
  },
  saveDraft: async ({ attachmentId, isNew }, data) => {
    const description = label ? `${label}: ${getName?.(data) ?? attachmentId}` : undefined;
    const attachment = isNew
      ? await attachments.add({ id: attachmentId, type, description, data })
      : await attachments.update(attachmentId, { data, description });

    if (!attachment) {
      throw new Error(
        `Failed to persist ${label?.toLowerCase() ?? type} attachment "${attachmentId}".`
      );
    }
    return attachment;
  },
});

/** Creates a typed client for reading and writing conversation attachments of any type. */
export const createAttachmentsClient = (
  attachments: AttachmentStateManager
): AttachmentsClient => ({
  rules: createTypedAttachmentClient<RuleAttachmentData>(attachments, RULE_ATTACHMENT_TYPE, {
    label: 'Rule',
    getName: (data) => data.metadata?.name,
  }),
  actionPolicies: createTypedAttachmentClient<ActionPolicyAttachmentData>(
    attachments,
    ACTION_POLICY_ATTACHMENT_TYPE,
    { label: 'Action Policy', getName: (data) => data.name }
  ),
  workflows: createTypedAttachmentClient<WorkflowYamlAttachmentData>(
    attachments,
    WORKFLOW_YAML_ATTACHMENT_TYPE,
    { label: 'Workflow', getName: (data) => data.name }
  ),
  ofType: (type, options) => createTypedAttachmentClient(attachments, type, options),
});
