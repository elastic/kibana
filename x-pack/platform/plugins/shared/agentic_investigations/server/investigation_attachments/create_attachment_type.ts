/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type {
  InvestigationAttachmentDocument,
  StoredInvestigationAttachment,
} from '../../common/investigation_attachments';
import type { InvestigationAttachmentDocService } from './attachment_doc_service';
import { sameInvestigationAttachmentDocument } from './same_document';

export interface InvestigationAttachmentTypeOptions<
  TType extends string,
  TStored extends StoredInvestigationAttachment
> {
  type: TType;
  /** Full stored document, including documents written by earlier schema versions. */
  schema: z.ZodType<InvestigationAttachmentDocument<TStored>>;
  getService: () => InvestigationAttachmentDocService<TStored>;
  /**
   * Throws when the caller may not read the entity. `resolve` and `isStale` read the index as the
   * internal user by an origin the caller supplies (the public attachment route accepts an
   * origin without data), so they check it before reading.
   */
  assertCanRead: (request: KibanaRequest) => Promise<void>;
  logger: Logger;
  /** Text the LLM sees for this attachment. */
  format: (document: InvestigationAttachmentDocument<TStored>) => string;
  agentDescription: string;
  /**
   * Whether the conversation copy lags the index. Defaults to comparing the bodies without
   * `updatedAt`, so re-stamping an unchanged document is not reported as a change.
   */
  isStale?: (
    stored: InvestigationAttachmentDocument<TStored>,
    current: InvestigationAttachmentDocument<TStored>
  ) => boolean;
  maxContentLength?: number;
}

const withoutUpdatedAt = (document: object): object => {
  const { updatedAt: _updatedAt, ...rest } = document as { updatedAt?: string };
  return rest;
};

const defaultIsStale = (stored: object, current: object): boolean =>
  !sameInvestigationAttachmentDocument(withoutUpdatedAt(stored), withoutUpdatedAt(current));

/**
 * Agent Builder type for a by-reference investigation attachment. Readonly, so the generic
 * attachment tools cannot edit it; the owning plugin's routes, steps, and tools write the index
 * and re-stamp the attachment. Origin is the document id.
 */
export const createInvestigationAttachmentType = <
  TType extends string,
  TStored extends StoredInvestigationAttachment
>({
  type,
  schema,
  getService,
  assertCanRead,
  logger,
  format,
  agentDescription,
  isStale = defaultIsStale,
  maxContentLength,
}: InvestigationAttachmentTypeOptions<TType, TStored>): AttachmentTypeDefinition<
  TType,
  InvestigationAttachmentDocument<TStored>
> => ({
  id: type,
  isReadonly: true,
  ...(maxContentLength !== undefined && { maxContentLength }),
  validate: (input) => {
    const result = schema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  resolve: async (origin, context) => {
    try {
      await assertCanRead(context.request);
      return await getService().get(origin, context.spaceId);
    } catch (error) {
      logger.warn(`Failed to resolve ${type} for origin "${origin}": ${error}`);
      return undefined;
    }
  },
  isStale: async (attachment, context) => {
    try {
      const latest = getLatestVersion(attachment);
      if (!latest) {
        return false;
      }
      await assertCanRead(context.request);
      const current = await getService().get(attachment.origin, context.spaceId);
      if (!current) {
        return false;
      }
      return isStale(latest.data, current);
    } catch (error) {
      logger.warn(`Failed to check staleness for ${type} "${attachment.origin}": ${error}`);
      return false;
    }
  },
  format: (attachment) => ({
    getRepresentation: () => ({ type: 'text', value: format(attachment.data) }),
  }),
  getAgentDescription: () => agentDescription,
});
