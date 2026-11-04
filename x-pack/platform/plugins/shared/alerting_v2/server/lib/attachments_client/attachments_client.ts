/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  getLatestVersion,
  type AttachmentRefActor,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ActionPolicyAttachmentData, RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  RULE_ATTACHMENT_TYPE,
  actionPolicyAttachmentDataSchema,
  ruleAttachmentDataSchema,
} from '@kbn/alerting-v2-schemas';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';

/**
 * Workflow attachment payloads are owned by the workflows plugin. This client only
 * checks that the payload is an object, so a schema change there does not drop it.
 */
const workflowYamlAttachmentDataSchema = lazySchema(() => z.looseObject({}));

export type WorkflowYamlAttachmentData = Record<string, unknown>;

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
  /**
   * Returns the latest version of an active or inactive attachment, or `undefined`
   * if it is missing, of another type, or its current payload is not that type.
   */
  get(attachmentId: string): AttachmentEntry<TData> | undefined;
  /** Returns the latest version of every active attachment of this type whose payload matches. */
  list(): Array<AttachmentEntry<TData>>;
  /** Loads an attachment for editing; an unknown or omitted id yields a new, empty draft. */
  getDraft(attachmentId?: string): AttachmentDraft<TData>;
  /**
   * Adds or updates the draft's attachment with `data`. A new attachment is linked to
   * `draft.origin` when set. `actor` attributes the change; it defaults to the current caller.
   */
  saveDraft(
    draft: AttachmentDraft<TData>,
    data: Partial<TData>,
    actor?: AttachmentRefActor
  ): Promise<VersionedAttachment>;
}

export interface TypedAttachmentClientOptions<TData> {
  /** Human-readable type name used in the saved description (`<label>: <name>`) and errors. */
  label?: string;
  getName: (data: Partial<TData>) => string | undefined;
}

interface AttachmentDataSchema<TData> {
  safeParse(data: unknown): { success: boolean };
  partial(): { safeParse(data: unknown): { success: boolean } };
}

export interface AttachmentsClient {
  rules: TypedAttachmentClient<RuleAttachmentData>;
  actionPolicies: TypedAttachmentClient<ActionPolicyAttachmentData>;
  workflows: TypedAttachmentClient<WorkflowYamlAttachmentData>;
}

const parsedBy =
  <TData>(schema: { safeParse(data: unknown): { success: boolean } }) =>
  (data: unknown): data is TData =>
    schema.safeParse(data).success;

const toEntry = <TData>(
  record: VersionedAttachment,
  isData: (data: unknown) => data is TData
): AttachmentEntry<TData> | undefined => {
  const latest = getLatestVersion(record);
  if (!latest || !isData(latest.data)) {
    return undefined;
  }
  return {
    id: record.id,
    type: record.type,
    version: latest.version,
    description: record.description,
    origin: record.origin,
    data: latest.data,
  };
};

const createTypedAttachmentClient = <TData>(
  attachments: AttachmentStateManager,
  type: string,
  schema: AttachmentDataSchema<TData>,
  { label, getName }: TypedAttachmentClientOptions<TData>
): TypedAttachmentClient<TData> => {
  const isData = parsedBy<TData>(schema);
  const isDraft = parsedBy<Partial<TData>>(schema.partial());
  return {
    type,
    get: (attachmentId) => {
      const record = attachments.getAttachmentRecord(attachmentId);
      return record?.type === type ? toEntry(record, isData) : undefined;
    },
    list: () =>
      attachments.getActive().flatMap((record) => {
        if (record.type !== type) {
          return [];
        }
        const entry = toEntry(record, isData);
        return entry ? [entry] : [];
      }),
    getDraft: (attachmentId) => {
      const record = attachmentId ? attachments.getAttachmentRecord(attachmentId) : undefined;
      if (record && record.type !== type) {
        throw new Error(
          `Attachment "${attachmentId}" is of type "${record.type}", expected "${type}".`
        );
      }
      const latest = record ? getLatestVersion(record) : undefined;
      return {
        attachmentId: attachmentId ?? uuidv4(),
        isNew: !record,
        origin: record?.origin,
        data: latest && isDraft(latest.data) ? latest.data : {},
      };
    },
    saveDraft: async ({ attachmentId, isNew, origin }, data, actor) => {
      const description = `${label ?? type}: ${getName(data) ?? attachmentId}`;
      const addInput = { id: attachmentId, type, description, data, ...(origin && { origin }) };
      const updateInput = label ? { data, description } : { data };
      const attachment = isNew
        ? await attachments.add(addInput, actor)
        : await attachments.update(attachmentId, updateInput, actor);

      if (!attachment) {
        throw new Error(
          `Failed to persist ${label?.toLowerCase() ?? type} attachment "${attachmentId}".`
        );
      }
      return attachment;
    },
  };
};

/** Creates a typed client for rule, action policy, and workflow conversation attachments. */
export const createAttachmentsClient = (
  attachments: AttachmentStateManager
): AttachmentsClient => ({
  rules: createTypedAttachmentClient(attachments, RULE_ATTACHMENT_TYPE, ruleAttachmentDataSchema, {
    label: 'Rule',
    getName: (data) => data.metadata?.name,
  }),
  actionPolicies: createTypedAttachmentClient(
    attachments,
    ACTION_POLICY_ATTACHMENT_TYPE,
    actionPolicyAttachmentDataSchema,
    { label: 'Action Policy', getName: (data) => data.name }
  ),
  workflows: createTypedAttachmentClient<WorkflowYamlAttachmentData>(
    attachments,
    WORKFLOW_YAML_ATTACHMENT_TYPE,
    workflowYamlAttachmentDataSchema,
    {
      label: 'Workflow',
      getName: (data) => (typeof data.name === 'string' ? data.name : undefined),
    }
  ),
});
