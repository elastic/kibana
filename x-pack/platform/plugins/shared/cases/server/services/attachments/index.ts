/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { AttachmentAttributesRt, AttachmentType } from '../../../common/types/domain';
import { decodeOrThrow } from '../../common/runtime_types';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  FILE_ATTACHMENT_TYPE,
} from '../../../common/constants';
import type { AggregationResponse } from '../../client/metrics/types';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type {
  AlertsAttachedToCaseArgs,
  AttachmentsAttachedToCaseArgs,
  BulkCreateAttachments,
  BulkUpdateAttachmentArgs,
  CountActionsAttachedToCaseArgs,
  CreateAttachmentArgs,
  DeleteAttachmentArgs,
  ServiceContext,
  UpdateAttachmentArgs,
} from './types';
import { AttachmentGetter } from './operations/get';
import type {
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../common/types/attachments';
import {
  AttachmentTransformedAttributesRt,
  AttachmentPartialAttributesRt,
} from '../../common/types/attachments';
import type {
  CasePersistedAttributes,
  EmbeddedAttachmentPersistedAttributes,
} from '../../common/types/case';

/**
 * Converts an embedded attachment into a SavedObject shape for backward compatibility
 * with callers that expect the SavedObject structure.
 */
export function embeddedToSavedObject(
  attachment: EmbeddedAttachmentPersistedAttributes,
  _caseVersion?: string
): AttachmentSavedObjectTransformed {
  const { id, _version, ...attributes } = attachment;
  return {
    id,
    type: CASE_COMMENT_SAVED_OBJECT,
    // Use the per-attachment version counter (independent of case SO version)
    version: String(_version ?? 1),
    attributes: attributes as unknown as AttachmentTransformedAttributes,
    references: [],
    namespaces: [],
  };
}

/**
 * Converts an embedded attachment into a SavedObjectsFindResult shape.
 */
function embeddedToFindResult(
  attachment: EmbeddedAttachmentPersistedAttributes,
  caseVersion?: string
): SavedObjectsFindResult<AttachmentTransformedAttributes> {
  return {
    ...embeddedToSavedObject(attachment, caseVersion),
    score: 0,
  };
}

export class AttachmentService {
  private readonly _getter: AttachmentGetter;

  constructor(private readonly context: ServiceContext) {
    this._getter = new AttachmentGetter(context);
  }

  public get getter() {
    return this._getter;
  }

  /**
   * Reads the case SO and returns the case along with its embedded attachments.
   */
  public async getCaseWithAttachments(caseId: string): Promise<{
    caseSO: SavedObject<CasePersistedAttributes>;
    attachments: EmbeddedAttachmentPersistedAttributes[];
  }> {
    const caseSO = await this.context.unsecuredSavedObjectsClient.get<CasePersistedAttributes>(
      CASE_SAVED_OBJECT,
      caseId
    );
    return { caseSO, attachments: caseSO.attributes.attachments ?? [] };
  }

  /**
   * Computes attachment stats from the embedded array.
   */
  private computeStats(attachments: EmbeddedAttachmentPersistedAttributes[]) {
    let totalComments = 0;
    const alertIds = new Set<string>();
    const eventIds = new Set<string>();

    for (const a of attachments) {
      if (a.type === AttachmentType.user) {
        totalComments++;
      }
      if (a.type === AttachmentType.alert && a.alertId) {
        const ids = Array.isArray(a.alertId) ? a.alertId : [a.alertId];
        ids.forEach((id) => alertIds.add(id));
      }
      if (a.type === AttachmentType.event && a.eventId) {
        const ids = Array.isArray(a.eventId) ? a.eventId : [a.eventId];
        ids.forEach((id) => eventIds.add(id));
      }
    }

    return {
      total_comments: totalComments,
      total_alerts: alertIds.size,
      total_events: eventIds.size,
    };
  }

  public async countAlertsAttachedToCase(
    params: AlertsAttachedToCaseArgs
  ): Promise<number | undefined> {
    try {
      this.context.log.debug(`Attempting to count alerts for case id ${params.caseId}`);
      const { attachments } = await this.getCaseWithAttachments(params.caseId);
      const alertIds = new Set<string>();

      for (const a of attachments) {
        if (a.type === AttachmentType.alert && a.alertId) {
          const ids = Array.isArray(a.alertId) ? a.alertId : [a.alertId];
          ids.forEach((id) => alertIds.add(id));
        }
      }

      return alertIds.size;
    } catch (error) {
      this.context.log.error(`Error while counting alerts for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Executes the aggregations against a type of attachment attached to a case.
   * For embedded attachments, this computes the equivalent in-memory.
   */
  public async executeCaseAggregations<Agg extends AggregationResponse = AggregationResponse>({
    caseId,
    attachmentType,
  }: AttachmentsAttachedToCaseArgs): Promise<Agg | undefined> {
    try {
      this.context.log.debug(`Attempting to aggregate for case id ${caseId}`);
      const { attachments } = await this.getCaseWithAttachments(caseId);
      const filtered = attachments.filter((a) => a.type === attachmentType);

      if (attachmentType === AttachmentType.alert) {
        const alertIds = new Set<string>();
        for (const a of filtered) {
          if (a.alertId) {
            const ids = Array.isArray(a.alertId) ? a.alertId : [a.alertId];
            ids.forEach((id) => alertIds.add(id));
          }
        }
        return { alerts: { value: alertIds.size } } as unknown as Agg;
      }

      return { count: filtered.length } as unknown as Agg;
    } catch (error) {
      this.context.log.error(`Error while executing aggregation for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Counts the persistableState and externalReference attachments that are not .files
   */
  public async countPersistableStateAndExternalReferenceAttachments({
    caseId,
  }: {
    caseId: string;
  }): Promise<number> {
    try {
      this.context.log.debug(
        `Attempting to count persistableState and externalReference attachments for case id ${caseId}`
      );
      const { attachments } = await this.getCaseWithAttachments(caseId);

      return attachments.filter(
        (a) =>
          (a.type === AttachmentType.persistableState ||
            a.type === AttachmentType.externalReference) &&
          a.externalReferenceAttachmentTypeId !== FILE_ATTACHMENT_TYPE
      ).length;
    } catch (error) {
      this.context.log.error(
        `Error while attempting to count persistableState and externalReference attachments for case id ${caseId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Executes the aggregations against the actions attached to a case.
   */
  public async executeCaseActionsAggregations(
    params: CountActionsAttachedToCaseArgs
  ): Promise<AggregationResponse | undefined> {
    try {
      this.context.log.debug(`Attempting to count actions for case id ${params.caseId}`);
      return await this.executeCaseAggregations({
        ...params,
        attachmentType: AttachmentType.actions,
      });
    } catch (error) {
      this.context.log.error(`Error while counting actions for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  public async bulkDelete({ attachmentIds, refresh, caseId }: DeleteAttachmentArgs) {
    try {
      if (attachmentIds.length <= 0) {
        return;
      }

      this.context.log.debug(`Attempting to DELETE attachments ${attachmentIds}`);
      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);
      const idsToDelete = new Set(attachmentIds);
      const remaining = attachments.filter((a) => !idsToDelete.has(a.id));

      // Clean up references namespaced to deleted attachments
      const cleanedRefs = (caseSO.references ?? []).filter(
        (ref) => !attachmentIds.some((id) => ref.name.startsWith(`attachment:${id}:`))
      );

      const stats = this.computeStats(remaining);

      await this.context.unsecuredSavedObjectsClient.update<CasePersistedAttributes>(
        CASE_SAVED_OBJECT,
        caseId,
        { attachments: remaining, ...stats },
        { version: caseSO.version, references: cleanedRefs, refresh }
      );
    } catch (error) {
      this.context.log.error(`Error on DELETE attachments ${attachmentIds}: ${error}`);
      throw error;
    }
  }

  public async create({
    attributes,
    references,
    id,
    refresh,
    caseId,
  }: CreateAttachmentArgs): Promise<AttachmentSavedObjectTransformed> {
    try {
      this.context.log.debug(`Attempting to POST a new comment`);

      const decodedAttributes = decodeOrThrow(AttachmentAttributesRt)(attributes);

      // Build the embedded attachment
      const embeddedAttachment: EmbeddedAttachmentPersistedAttributes = {
        id,
        _version: 1,
        ...(decodedAttributes as unknown as Omit<EmbeddedAttachmentPersistedAttributes, 'id' | '_version'>),
      };

      // Read current case
      const { caseSO, attachments: existingAttachments } =
        await this.getCaseWithAttachments(caseId);

      const updatedAttachments = [...existingAttachments, embeddedAttachment];

      // Namespace attachment-specific references (strip case ref, prefix others)
      const attachmentRefs: SavedObjectReference[] = references
        .filter((ref) => ref.type !== CASE_SAVED_OBJECT)
        .map((ref) => ({ ...ref, name: `attachment:${id}:${ref.name}` }));

      const mergedRefs = [...(caseSO.references ?? []), ...attachmentRefs];

      const stats = this.computeStats(updatedAttachments);

      // Single write: update case SO with new attachment + updated stats
      const updatedCase =
        await this.context.unsecuredSavedObjectsClient.update<CasePersistedAttributes>(
          CASE_SAVED_OBJECT,
          caseId,
          { attachments: updatedAttachments, ...stats },
          { version: caseSO.version, references: mergedRefs, refresh }
        );

      // Return a SavedObject-shaped response for backward compatibility
      const result = embeddedToSavedObject(embeddedAttachment, updatedCase.version);

      const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
        result.attributes
      );

      return Object.assign(result, { attributes: validatedAttributes });
    } catch (error) {
      this.context.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({
    attachments,
    refresh,
    caseId,
  }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to bulk create attachments`);

      const { caseSO, attachments: existingAttachments } =
        await this.getCaseWithAttachments(caseId);

      const newEmbedded: EmbeddedAttachmentPersistedAttributes[] = [];
      const newRefs: SavedObjectReference[] = [];

      for (const attachment of attachments) {
        const decodedAttributes = decodeOrThrow(AttachmentAttributesRt)(attachment.attributes);

        const embedded: EmbeddedAttachmentPersistedAttributes = {
          id: attachment.id,
          _version: 1,
          ...(decodedAttributes as unknown as Omit<EmbeddedAttachmentPersistedAttributes, 'id' | '_version'>),
        };

        newEmbedded.push(embedded);

        // Namespace references
        const attachmentRefs = attachment.references
          .filter((ref) => ref.type !== CASE_SAVED_OBJECT)
          .map((ref) => ({ ...ref, name: `attachment:${attachment.id}:${ref.name}` }));
        newRefs.push(...attachmentRefs);
      }

      const updatedAttachments = [...existingAttachments, ...newEmbedded];
      const mergedRefs = [...(caseSO.references ?? []), ...newRefs];
      const stats = this.computeStats(updatedAttachments);

      const updatedCase =
        await this.context.unsecuredSavedObjectsClient.update<CasePersistedAttributes>(
          CASE_SAVED_OBJECT,
          caseId,
          { attachments: updatedAttachments, ...stats },
          { version: caseSO.version, references: mergedRefs, refresh }
        );

      // Build a SavedObjectsBulkResponse-shaped response
      const savedObjects = newEmbedded.map((embedded) => {
        const so = embeddedToSavedObject(embedded, updatedCase.version);
        const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
          so.attributes
        );
        return Object.assign(so, { attributes: validatedAttributes });
      });

      return { saved_objects: savedObjects };
    } catch (error) {
      this.context.log.error(`Error on bulk create attachments: ${error}`);
      throw error;
    }
  }

  public async update({
    attachmentId,
    updatedAttributes,
    options,
    caseId,
  }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to UPDATE comment ${attachmentId}`);

      const decodedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(updatedAttributes);

      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);

      const attachmentIndex = attachments.findIndex((a) => a.id === attachmentId);
      if (attachmentIndex === -1) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          CASE_COMMENT_SAVED_OBJECT,
          attachmentId
        );
      }

      // Merge updated attributes into the existing embedded attachment
      // Increment per-attachment version counter
      const updatedAttachment = {
        ...attachments[attachmentIndex],
        ...(decodedAttributes as Record<string, unknown>),
        _version: (attachments[attachmentIndex]._version ?? 1) + 1,
      };

      const updatedAttachments = [...attachments];
      updatedAttachments[attachmentIndex] =
        updatedAttachment as EmbeddedAttachmentPersistedAttributes;

      // Handle references from options
      let mergedRefs = caseSO.references ?? [];
      if (options?.references) {
        // Remove old refs for this attachment, add new ones
        mergedRefs = mergedRefs.filter(
          (ref) => !ref.name.startsWith(`attachment:${attachmentId}:`)
        );
        const newAttachmentRefs = options.references
          .filter((ref) => ref.type !== CASE_SAVED_OBJECT)
          .map((ref) => ({ ...ref, name: `attachment:${attachmentId}:${ref.name}` }));
        mergedRefs = [...mergedRefs, ...newAttachmentRefs];
      }

      const stats = this.computeStats(updatedAttachments);

      const updatedCase =
        await this.context.unsecuredSavedObjectsClient.update<CasePersistedAttributes>(
          CASE_SAVED_OBJECT,
          caseId,
          { attachments: updatedAttachments, ...stats },
          { version: caseSO.version, references: mergedRefs }
        );

      // Return an UpdateResponse-shaped result
      const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(decodedAttributes);

      return {
        id: attachmentId,
        type: CASE_COMMENT_SAVED_OBJECT,
        version: updatedCase.version ?? '0',
        attributes: validatedAttributes,
        references: options?.references ?? [],
      };
    } catch (error) {
      this.context.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({
    comments,
    refresh,
    caseId,
  }: BulkUpdateAttachmentArgs): Promise<
    SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributes>
  > {
    try {
      this.context.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );

      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);
      const updatedAttachments = [...attachments];
      const resultObjects: Array<SavedObjectsUpdateResponse<AttachmentTransformedAttributes>> = [];

      for (const c of comments) {
        const decodedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
          c.updatedAttributes
        );

        const idx = updatedAttachments.findIndex((a) => a.id === c.attachmentId);
        if (idx !== -1) {
          updatedAttachments[idx] = {
            ...updatedAttachments[idx],
            ...(decodedAttributes as Record<string, unknown>),
            _version: (updatedAttachments[idx]._version ?? 1) + 1,
          } as EmbeddedAttachmentPersistedAttributes;
        }
      }

      const stats = this.computeStats(updatedAttachments);

      const updatedCase =
        await this.context.unsecuredSavedObjectsClient.update<CasePersistedAttributes>(
          CASE_SAVED_OBJECT,
          caseId,
          { attachments: updatedAttachments, ...stats },
          { version: caseSO.version, refresh }
        );

      for (const c of comments) {
        const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
          c.updatedAttributes
        );
        resultObjects.push({
          id: c.attachmentId,
          type: CASE_COMMENT_SAVED_OBJECT,
          version: updatedCase.version ?? '0',
          attributes: validatedAttributes,
          references: c.options?.references ?? [],
        });
      }

      return { saved_objects: resultObjects };
    } catch (error) {
      this.context.log.error(
        `Error on UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }

  public async find({
    options,
    caseId,
  }: {
    options?: SavedObjectFindOptionsKueryNode;
    caseId?: string;
  }): Promise<SavedObjectsFindResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to find comments`);

      if (!caseId) {
        // Fallback: if no caseId provided, return empty response
        return {
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: options?.perPage ?? 20,
        };
      }

      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);

      // Apply type filter if present
      let filtered = attachments;

      // Check if the filter is looking for specific attachment types
      // The find endpoint typically filters for type === 'user' (comments only)
      if (options?.filter) {
        // Simple heuristic: check if filter string mentions a specific type
        const filterStr = JSON.stringify(options.filter);
        if (filterStr.includes('"user"')) {
          filtered = attachments.filter((a) => a.type === AttachmentType.user);
        }
      }

      // Apply sorting (default: created_at asc)
      const sortOrder = options?.sortOrder ?? 'asc';
      filtered.sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });

      // Apply pagination
      const page = options?.page ?? 1;
      const perPage = options?.perPage ?? 20;
      const start = (page - 1) * perPage;
      const paged = filtered.slice(start, start + perPage);

      const savedObjects: Array<SavedObjectsFindResult<AttachmentTransformedAttributes>> =
        paged.map((a) => embeddedToFindResult(a, caseSO.version));

      return {
        saved_objects: savedObjects,
        total: filtered.length,
        page,
        per_page: perPage,
      };
    } catch (error) {
      this.context.log.error(`Error on find comments: ${error}`);
      throw error;
    }
  }
}
