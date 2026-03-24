/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { isSOError } from '../../../common/error';
import { decodeOrThrow } from '../../../common/runtime_types';
import type {
  AttachmentPersistedAttributes,
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../../common/types/attachments_v1';
import { AttachmentTransformedAttributesRt } from '../../../common/types/attachments_v1';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  MAX_DOCS_PER_PAGE,
} from '../../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { buildFilter, combineFilters } from '../../../client/utils';
import type {
  AttachmentMode,
  AttachmentTotals,
  DocumentAttachmentAttributes,
} from '../../../../common/types/domain';
import { AttachmentType, DocumentAttachmentAttributesRt } from '../../../../common/types/domain';
import type {
  AlertIdsAggsResult,
  BulkOptionalAttributes,
  EventIdsAggsResult,
  GetAllAlertsAttachToCaseArgs as GetAllDocumentsAttachedToCaseArgs,
  GetAttachmentArgs,
  MixSavedObjectResponse,
  ServiceContext,
} from '../types';
import type {
  AttachmentAttributesV2,
  AttachmentSavedObjectTransformedV2,
  UnifiedAttachmentAttributes,
} from '../../../common/types/attachments_v2';
import {
  injectAttachmentAttributesAndHandleErrors,
  injectAttachmentSOAttributesFromRefs,
} from '../../so_references';
import { partitionByCaseAssociation } from '../../../common/partitioning';
import type { AttachmentSavedObject } from '../../../common/types';
import { getCaseReferenceId } from '../../../common/references';
import { transformAttributesForMode } from './utils';

export class AttachmentGetter {
  constructor(private readonly context: ServiceContext) {}

  public async bulkGet(
    attachmentIds: string[],
    mode: AttachmentMode
  ): Promise<BulkOptionalAttributes<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments with ids: ${attachmentIds.join()}`
      );

      const isCaseAttachmentsEnabled = this.context.config.attachments?.enabled;
      const response =
        await this.context.unsecuredSavedObjectsClient.bulkGet<AttachmentAttributesV2>(
          attachmentIds.flatMap((id) =>
            isCaseAttachmentsEnabled
              ? [
                  { id, type: CASE_ATTACHMENT_SAVED_OBJECT },
                  { id, type: CASE_COMMENT_SAVED_OBJECT },
                ]
              : [{ id, type: CASE_COMMENT_SAVED_OBJECT }]
          )
        );

      const merged = this.mergeBulkGetResults(response.saved_objects, isCaseAttachmentsEnabled);

      if (mode === 'legacy') {
        return this.transformAndDecodeBulkGetResponseLegacy(merged);
      }
      return this.transformAndDecodeBulkGetResponseUnified(merged);
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments with ids ${attachmentIds.join()}: ${error}`
      );
      throw error;
    }
  }

  private mergeBulkGetResults(
    savedObjects: Array<SavedObject<AttachmentAttributesV2> | { id: string; error: unknown }>,
    isCaseAttachmentsEnabled: boolean
  ): Array<MixSavedObjectResponse> {
    if (!isCaseAttachmentsEnabled) {
      return savedObjects;
    }
    // When FF is on we query 2 SO types per id: one may hit, one may 404. For non-existent ids
    // both 404. We must preserve one "not found" error per id that has no hits so the client
    // can return it.
    const result: Array<MixSavedObjectResponse> = [];
    for (let i = 0; i < savedObjects.length; i += 2) {
      const pair = [savedObjects[i], savedObjects[i + 1]] as const;
      const hit = pair.find((so) => !isSOError(so));
      if (hit) {
        result.push(hit);
      } else {
        result.push(pair[0]);
      }
    }
    return result;
  }

  private transformAndDecodeBulkGetResponseLegacy(
    merged: Array<MixSavedObjectResponse>
  ): BulkOptionalAttributes<AttachmentTransformedAttributes> {
    const validatedAttachments: AttachmentSavedObjectTransformed[] = [];

    for (const so of merged) {
      if (isSOError(so)) {
        validatedAttachments.push(so as AttachmentSavedObjectTransformed);
      } else {
        const transformed = transformAttributesForMode({
          attributes: (so as SavedObject<AttachmentAttributesV2>).attributes,
          mode: 'legacy',
        });
        if (transformed.isUnified) {
          throw new Error('Error transforming attachment to legacy mode');
        }
        const legacySo = {
          ...so,
          attributes: transformed.attributes,
        } as SavedObject<AttachmentPersistedAttributes>;

        const transformedAttachment = injectAttachmentAttributesAndHandleErrors(
          legacySo,
          this.context.persistableStateAttachmentTypeRegistry
        );
        const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
          transformedAttachment.attributes
        );
        validatedAttachments.push(
          Object.assign(transformedAttachment, { attributes: validatedAttributes })
        );
      }
    }

    return {
      saved_objects: validatedAttachments,
    };
  }
  // the return type is a mix of legacy and unified until
  // all the attachments are migrated
  private transformAndDecodeBulkGetResponseUnified(
    merged: Array<MixSavedObjectResponse>
  ): BulkOptionalAttributes<AttachmentAttributesV2> {
    const validatedAttachments: Array<AttachmentSavedObjectTransformedV2> = [];

    for (const so of merged) {
      if (isSOError(so)) {
        validatedAttachments.push(so as AttachmentSavedObjectTransformedV2);
      } else {
        const transformed = transformAttributesForMode({
          attributes: (so as SavedObject<AttachmentAttributesV2>).attributes,
          mode: 'unified',
        });
        if (transformed.isUnified) {
          validatedAttachments.push(
            Object.assign(so, {
              attributes: transformed.attributes,
            }) as AttachmentSavedObjectTransformedV2
          );
        } else {
          const legacySo = {
            ...so,
            attributes: transformed.attributes,
          } as SavedObject<AttachmentPersistedAttributes>;
          const transformedAttachment = injectAttachmentAttributesAndHandleErrors(
            legacySo,
            this.context.persistableStateAttachmentTypeRegistry
          );
          const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
            transformedAttachment.attributes
          );

          validatedAttachments.push(
            Object.assign(transformedAttachment, { attributes: validatedAttributes })
          );
        }
      }
    }

    return {
      saved_objects: validatedAttachments,
    };
  }

  public async getAttachmentIdsForCases({ caseIds }: { caseIds: string[] }) {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments associated with cases: [${caseIds}]`
      );

      // We are intentionally not adding the type here because we only want to interact with the id and this function
      // should not use the attributes
      const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<unknown>({
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
        hasReference: caseIds.map((id) => ({ id, type: CASE_SAVED_OBJECT })),
        sortField: 'created_at',
        sortOrder: 'asc',
        /**
         * We only care about the ids so to reduce the data returned we should limit the fields in the response. Core
         * doesn't support retrieving no fields (id would always be returned anyway) so to limit it we'll only request
         * the owner even though we don't need it.
         */
        fields: ['owner'],
        perPage: MAX_DOCS_PER_PAGE,
      });

      const idTypePairs: Array<{ id: string; type: string }> = [];
      for await (const attachmentSavedObject of finder.find()) {
        idTypePairs.push(
          ...attachmentSavedObject.saved_objects.map((attachment) => ({
            id: attachment.id,
            type: attachment.type,
          }))
        );
      }

      return idTypePairs;
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
    filter,
    attachmentTypes = [AttachmentType.alert, AttachmentType.event],
  }: GetAllDocumentsAttachedToCaseArgs): Promise<Array<SavedObject<DocumentAttachmentAttributes>>> {
    try {
      this.context.log.debug(`Attempting to GET all documents for case id ${caseId}`);
      const documentsFilter = buildFilter({
        filters: attachmentTypes,
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([documentsFilter, filter]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<AttachmentPersistedAttributes>(
          {
            type: CASE_COMMENT_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            sortField: 'created_at',
            sortOrder: 'asc',
            filter: combinedFilter,
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      let result: Array<SavedObject<DocumentAttachmentAttributes>> = [];
      for await (const userActionSavedObject of finder.find()) {
        result = result.concat(AttachmentGetter.decodeDocuments(userActionSavedObject));
      }

      return result;
    } catch (error) {
      this.context.log.error(`Error on GET all documents for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  private static decodeDocuments(
    response: SavedObjectsFindResponse<AttachmentPersistedAttributes>
  ): Array<SavedObject<DocumentAttachmentAttributes>> {
    return response.saved_objects.map((so) => {
      const validatedAttributes = decodeOrThrow(DocumentAttachmentAttributesRt)(so.attributes);

      return Object.assign(so, { attributes: validatedAttributes });
    });
  }

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertIds({ caseId }: { caseId: string }): Promise<Set<string>> {
    try {
      this.context.log.debug(`Attempting to GET all alerts ids for case id ${caseId}`);
      const alertsFilter = buildFilter({
        filters: [AttachmentType.alert],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const res = await this.context.unsecuredSavedObjectsClient.find<unknown, AlertIdsAggsResult>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: alertsFilter,
        perPage: 0,
        aggs: {
          alertIds: {
            terms: {
              field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
              size: MAX_ALERTS_PER_CASE,
            },
          },
        },
      });

      const alertIds = res.aggregations?.alertIds.buckets.map((bucket) => bucket.key) ?? [];
      return new Set(alertIds);
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
      const eventsFilter = buildFilter({
        filters: [AttachmentType.event],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const res = await this.context.unsecuredSavedObjectsClient.find<unknown, EventIdsAggsResult>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: eventsFilter,
        perPage: 0,
        aggs: {
          eventIds: {
            terms: {
              field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.eventId`,
              size: MAX_ALERTS_PER_CASE,
            },
          },
        },
      });

      const eventIds = res.aggregations?.eventIds.buckets.map((bucket) => bucket.key) ?? [];
      return new Set(eventIds);
    } catch (error) {
      this.context.log.error(`Error on GET all event ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async get({
    attachmentId,
    mode,
  }: GetAttachmentArgs): Promise<AttachmentSavedObjectTransformedV2> {
    try {
      this.context.log.debug(`Attempting to GET attachment ${attachmentId}`);
      const isCasesAttachmentsEnabled = this.context.config.attachments?.enabled;

      let res:
        | SavedObject<UnifiedAttachmentAttributes>
        | SavedObject<AttachmentPersistedAttributes>;

      if (isCasesAttachmentsEnabled) {
        // if feature flag is enabled, try to fetch unified first
        try {
          res = await this.context.unsecuredSavedObjectsClient.get<UnifiedAttachmentAttributes>(
            CASE_ATTACHMENT_SAVED_OBJECT,
            attachmentId
          );
        } catch (error) {
          if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
            throw error;
          }
          this.context.log.debug(
            `Attachment ${attachmentId} not found in ${CASE_ATTACHMENT_SAVED_OBJECT}, falling back to ${CASE_COMMENT_SAVED_OBJECT}`
          );
          res = await this.context.unsecuredSavedObjectsClient.get<AttachmentPersistedAttributes>(
            CASE_COMMENT_SAVED_OBJECT,
            attachmentId
          );
        }
      } else {
        res = await this.context.unsecuredSavedObjectsClient.get<AttachmentPersistedAttributes>(
          CASE_COMMENT_SAVED_OBJECT,
          attachmentId
        );
      }

      const transformed = transformAttributesForMode({
        attributes: res.attributes,
        mode,
      });
      if (transformed.isUnified) {
        return Object.assign(res, { attributes: transformed.attributes });
      }

      const transformedAttachment = injectAttachmentSOAttributesFromRefs(
        { ...res, attributes: transformed.attributes },
        this.context.persistableStateAttachmentTypeRegistry
      );

      const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
        transformedAttachment.attributes
      );

      return Object.assign(transformedAttachment, { attributes: validatedAttributes });
    } catch (error) {
      this.context.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
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

    interface AggsResult {
      references: {
        caseIds: {
          buckets: Array<{
            key: string;
            doc_count: number;
            reverse: {
              alerts: {
                value: number;
              };
              comments: {
                doc_count: number;
              };
              events: {
                value: number;
              };
            };
          }>;
        };
      };
    }

    const res = await this.context.unsecuredSavedObjectsClient.find<unknown, AggsResult>({
      hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
      hasReferenceOperator: 'OR',
      type: CASE_COMMENT_SAVED_OBJECT,
      perPage: 0,
      aggs: AttachmentGetter.buildCommentStatsAggs(caseIds),
    });

    const statsMap =
      res.aggregations?.references.caseIds.buckets.reduce((acc, idBucket) => {
        acc.set(idBucket.key, {
          userComments: idBucket.reverse.comments.doc_count,
          alerts: idBucket.reverse.alerts.value,
          events: idBucket.reverse.events.value,
        });
        return acc;
      }, new Map<string, AttachmentTotals>()) ?? new Map();

    if (this.context.config.attachments?.enabled) {
      const unifiedCommentsByCase = await this.getUnifiedCommentCountByCaseId(caseIds);
      for (const [caseId, count] of unifiedCommentsByCase) {
        const existing = statsMap.get(caseId);
        if (existing) {
          statsMap.set(caseId, {
            ...existing,
            userComments: existing.userComments + count,
          });
        } else {
          statsMap.set(caseId, {
            userComments: count,
            alerts: 0,
            events: 0,
          });
        }
      }
    }

    return statsMap;
  }

  private async getUnifiedCommentCountByCaseId(caseIds: string[]): Promise<Map<string, number>> {
    interface UnifiedCommentAggs {
      refs: {
        caseIds: {
          buckets: Array<{ key: string; doc_count: number }>;
        };
      };
    }
    const res = await this.context.unsecuredSavedObjectsClient.find<unknown, UnifiedCommentAggs>({
      hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
      hasReferenceOperator: 'OR',
      type: CASE_ATTACHMENT_SAVED_OBJECT,
      perPage: 0,
      filter: buildFilter({
        filters: [COMMENT_ATTACHMENT_TYPE],
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      }),
      aggs: {
        refs: {
          nested: {
            path: `${CASE_ATTACHMENT_SAVED_OBJECT}.references`,
          },
          aggregations: {
            caseIds: {
              terms: {
                field: `${CASE_ATTACHMENT_SAVED_OBJECT}.references.id`,
                size: caseIds.length,
              },
            },
          },
        },
      },
    });

    const byCase = new Map<string, number>();
    const buckets = res.aggregations?.refs?.caseIds?.buckets ?? [];
    for (const bucket of buckets) {
      byCase.set(bucket.key, bucket.doc_count);
    }
    return byCase;
  }

  private static buildCommentStatsAggs(
    ids: string[]
  ): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      references: {
        nested: {
          path: `${CASE_COMMENT_SAVED_OBJECT}.references`,
        },
        aggregations: {
          caseIds: {
            terms: {
              field: `${CASE_COMMENT_SAVED_OBJECT}.references.id`,
              size: ids.length,
            },
            aggregations: {
              reverse: {
                reverse_nested: {},
                aggregations: {
                  alerts: {
                    cardinality: {
                      field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
                    },
                  },
                  comments: {
                    filter: {
                      term: {
                        [`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`]: AttachmentType.user,
                      },
                    },
                  },
                  events: {
                    cardinality: {
                      field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.eventId`,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
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

      /**
       * This is making a big assumption that a single file service saved object can only be associated within a single
       * case. If a single file can be attached to multiple cases it will complicate deleting a file.
       *
       * The file's metadata would have to contain all case ids and deleting a file would need to removing a case id from
       * array instead of deleting the entire saved object in the situation where the file is attached to multiple cases.
       */
      const references = fileIds.map((id) => ({ id, type: FILE_SO_TYPE }));

      /**
       * In the event that we add the ability to attach a file to a case that has already been uploaded we'll run into a
       * scenario where a single file id could be associated with multiple case attachments. So we need
       * to retrieve them all.
       */
      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<AttachmentPersistedAttributes>(
          {
            type: CASE_COMMENT_SAVED_OBJECT,
            hasReference: references,
            sortField: 'created_at',
            sortOrder: 'asc',
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      const foundAttachments: AttachmentSavedObjectTransformed[] = [];

      for await (const attachmentSavedObjects of finder.find()) {
        foundAttachments.push(...this.transformAndDecodeFileAttachments(attachmentSavedObjects));
      }

      const [validFileAttachments, invalidFileAttachments] = partitionByCaseAssociation(
        caseId,
        foundAttachments
      );

      this.logInvalidFileAssociations(invalidFileAttachments, fileIds, caseId);

      return validFileAttachments;
    } catch (error) {
      this.context.log.error(`Error retrieving file attachments file ids: ${fileIds}: ${error}`);
      throw error;
    }
  }

  private transformAndDecodeFileAttachments(
    response: SavedObjectsFindResponse<AttachmentPersistedAttributes>
  ): AttachmentSavedObjectTransformed[] {
    return response.saved_objects.map((so) => {
      const transformedFileAttachment = injectAttachmentSOAttributesFromRefs(
        so,
        this.context.persistableStateAttachmentTypeRegistry
      );

      const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
        transformedFileAttachment.attributes
      );

      return Object.assign(transformedFileAttachment, { attributes: validatedAttributes });
    });
  }

  private logInvalidFileAssociations(
    attachments: AttachmentSavedObject[],
    fileIds: string[],
    targetCaseId: string
  ) {
    const caseIds: string[] = [];
    for (const attachment of attachments) {
      const caseRefId = getCaseReferenceId(attachment.references);
      if (caseRefId != null) {
        caseIds.push(caseRefId);
      }
    }

    if (caseIds.length > 0) {
      this.context.log.warn(
        `Found files associated to cases outside of request: ${caseIds} file ids: ${fileIds} target case id: ${targetCaseId}`
      );
    }
  }
}
