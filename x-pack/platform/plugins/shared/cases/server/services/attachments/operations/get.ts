/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../../common/constants';
import { decodeOrThrow } from '../../../common/runtime_types';
import type {
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../../common/types/attachments';
import { AttachmentTransformedAttributesRt } from '../../../common/types/attachments';
import type {
  AttachmentTotals,
  DocumentAttachmentAttributes,
} from '../../../../common/types/domain';
import { AttachmentType, DocumentAttachmentAttributesRt } from '../../../../common/types/domain';
import type {
  GetAllAlertsAttachToCaseArgs as GetAllDocumentsAttachedToCaseArgs,
  GetAttachmentArgs,
  ServiceContext,
  BulkOptionalAttributes,
} from '../types';
import type { CasePersistedAttributes, EmbeddedAttachmentPersistedAttributes } from '../../../common/types/case';
import { embeddedToSavedObject } from '..';

export class AttachmentGetter {
  constructor(private readonly context: ServiceContext) {}

  /**
   * Read the case SO and return its embedded attachments.
   */
  private async getCaseWithAttachments(caseId: string): Promise<{
    caseSO: SavedObject<CasePersistedAttributes>;
    attachments: EmbeddedAttachmentPersistedAttributes[];
  }> {
    const caseSO = await this.context.unsecuredSavedObjectsClient.get<CasePersistedAttributes>(
      CASE_SAVED_OBJECT,
      caseId
    );
    return { caseSO, attachments: caseSO.attributes.attachments ?? [] };
  }

  public async get({
    attachmentId,
    caseId,
  }: GetAttachmentArgs): Promise<AttachmentSavedObjectTransformed> {
    try {
      this.context.log.debug(`Attempting to GET attachment ${attachmentId}`);
      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);
      const embedded = attachments.find((a) => a.id === attachmentId);

      if (!embedded) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          CASE_COMMENT_SAVED_OBJECT,
          attachmentId
        );
      }

      const so = embeddedToSavedObject(embedded, caseSO.version);
      const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(so.attributes);

      return Object.assign(so, { attributes: validatedAttributes });
    } catch (error) {
      this.context.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkGet(
    attachmentIds: string[],
    caseId?: string
  ): Promise<BulkOptionalAttributes<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments with ids: ${attachmentIds.join()}`
      );

      if (!caseId) {
        // If no caseId is provided, return empty results
        return { saved_objects: [] };
      }

      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);
      const idSet = new Set(attachmentIds);

      const savedObjects: AttachmentSavedObjectTransformed[] = [];

      for (const id of attachmentIds) {
        const embedded = attachments.find((a) => a.id === id);
        if (!embedded) {
          // Return an error object for missing attachments
          savedObjects.push({
            id,
            type: 'cases-comments',
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: `Saved object [cases-comments/${id}] not found`,
            },
            references: [],
            attributes: {} as AttachmentTransformedAttributes,
          } as unknown as AttachmentSavedObjectTransformed);
        } else {
          const so = embeddedToSavedObject(embedded, caseSO.version);
          const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
            so.attributes
          );
          savedObjects.push(Object.assign(so, { attributes: validatedAttributes }));
        }
      }

      return { saved_objects: savedObjects };
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments with ids ${attachmentIds.join()}: ${error}`
      );
      throw error;
    }
  }

  public async getAttachmentIdsForCases({ caseIds }: { caseIds: string[] }) {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments associated with cases: [${caseIds}]`
      );

      const ids: string[] = [];
      for (const caseId of caseIds) {
        const { attachments } = await this.getCaseWithAttachments(caseId);
        ids.push(...attachments.map((a) => a.id));
      }

      return ids;
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments associated with cases: [${caseIds}]: ${error}`
      );
      throw error;
    }
  }

  /**
   * Retrieves all the documents attached to a case.
   */
  public async getAllDocumentsAttachedToCase({
    caseId,
    attachmentTypes = [AttachmentType.alert, AttachmentType.event],
  }: GetAllDocumentsAttachedToCaseArgs): Promise<Array<SavedObject<DocumentAttachmentAttributes>>> {
    try {
      this.context.log.debug(`Attempting to GET all documents for case id ${caseId}`);
      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);

      const filtered = attachments.filter((a) =>
        attachmentTypes.includes(a.type as AttachmentType)
      );

      return filtered.map((a) => {
        const so = embeddedToSavedObject(a, caseSO.version);
        const validatedAttributes = decodeOrThrow(DocumentAttachmentAttributesRt)(so.attributes);
        return Object.assign(so, { attributes: validatedAttributes });
      });
    } catch (error) {
      this.context.log.error(`Error on GET all documents for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertIds({ caseId }: { caseId: string }): Promise<Set<string>> {
    try {
      this.context.log.debug(`Attempting to GET all alerts ids for case id ${caseId}`);
      const { attachments } = await this.getCaseWithAttachments(caseId);

      const alertIds = new Set<string>();
      for (const a of attachments) {
        if (a.type === AttachmentType.alert && a.alertId) {
          const ids = Array.isArray(a.alertId) ? a.alertId : [a.alertId];
          ids.forEach((id) => alertIds.add(id));
        }
      }

      return alertIds;
    } catch (error) {
      this.context.log.error(`Error on GET all alerts ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves all the events attached to a case.
   */
  public async getAllEventIds({ caseId }: { caseId: string }): Promise<Set<string>> {
    try {
      this.context.log.debug(`Attempting to GET all event ids for case id ${caseId}`);
      const { attachments } = await this.getCaseWithAttachments(caseId);

      const eventIds = new Set<string>();
      for (const a of attachments) {
        if (a.type === AttachmentType.event && a.eventId) {
          const ids = Array.isArray(a.eventId) ? a.eventId : [a.eventId];
          ids.forEach((id) => eventIds.add(id));
        }
      }

      return eventIds;
    } catch (error) {
      this.context.log.error(`Error on GET all event ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getCaseAttatchmentStats({
    caseIds,
  }: {
    caseIds: string[];
  }): Promise<Map<string, AttachmentTotals>> {
    if (caseIds.length <= 0) {
      return new Map();
    }

    const result = new Map<string, AttachmentTotals>();

    for (const caseId of caseIds) {
      try {
        const { attachments } = await this.getCaseWithAttachments(caseId);
        let userComments = 0;
        const alertIds = new Set<string>();
        const eventIds = new Set<string>();

        for (const a of attachments) {
          if (a.type === AttachmentType.user) {
            userComments++;
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

        result.set(caseId, {
          userComments,
          alerts: alertIds.size,
          events: eventIds.size,
        });
      } catch (error) {
        this.context.log.error(
          `Error computing attachment stats for case ${caseId}: ${error}`
        );
        // Set defaults on error
        result.set(caseId, { userComments: 0, alerts: 0, events: 0 });
      }
    }

    return result;
  }

  public async getFileAttachments({
    caseId,
    fileIds,
  }: {
    caseId: string;
    fileIds: string[];
  }): Promise<AttachmentSavedObjectTransformed[]> {
    try {
      this.context.log.debug('Attempting to find file attachments');
      const { caseSO, attachments } = await this.getCaseWithAttachments(caseId);

      // Filter for external reference attachments that reference the given file IDs
      const fileAttachments = attachments.filter((a) => {
        if (a.type !== AttachmentType.externalReference) {
          return false;
        }
        // Check if the external reference metadata contains matching file IDs
        const metadata = a.externalReferenceMetadata as Record<string, unknown> | undefined;
        if (metadata && Array.isArray(metadata.files)) {
          return metadata.files.some(
            (file: { name?: string; extension?: string; mimeType?: string; fileId?: string }) =>
              file.fileId && fileIds.includes(file.fileId)
          );
        }
        return false;
      });

      return fileAttachments.map((a) => {
        const so = embeddedToSavedObject(a, caseSO.version);
        const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
          so.attributes
        );
        return Object.assign(so, { attributes: validatedAttributes });
      });
    } catch (error) {
      this.context.log.error(`Error retrieving file attachments file ids: ${fileIds}: ${error}`);
      throw error;
    }
  }
}
