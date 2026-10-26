/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import Boom from '@hapi/boom';
import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import {
  type LegacyTypeMatch,
  toLegacyTypeMatches,
  toUnifiedAttachmentType,
  UNIFIED_ALERT_TYPES_ARRAY,
  getAttachmentTypeFromAttributes,
} from '../../../../common/utils/attachments';
import { getAttachmentSavedObjectType } from '../../../common/attachments';
import { generateCaseErrorResponse, isSOError } from '../../../common/error';
import { decodeOrThrowZod } from '../../../common/runtime_types';
import type { AttachmentPersistedAttributes } from '../../../common/types/attachments_v1';
import { AttachmentTransformedAttributesSchema } from '../../../common/types/attachments_v1';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  MAX_DOCS_PER_PAGE,
} from '../../../../common/constants';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LEGACY_ALERT_TYPE,
  LEGACY_EVENT_TYPE,
  LEGACY_EXTERNAL_REFERENCE_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';
import { NodeBuilderOperators, buildFilter, combineFilters } from '../../../client/utils';
import { commentsMatchFilter } from '../../../client/attachments/type_filter';
import type {
  AttachmentTotals,
  DocumentAttachmentAttributesV2,
} from '../../../../common/types/domain';
import { AttachmentType, ExternalReferenceStorageType } from '../../../../common/types/domain';
import {
  DocumentAttachmentAttributesSchemaV2,
  UnifiedAttachmentAttributesSchema,
} from '../../../../common/types/domain/attachment/v2';
import type {
  AlertIdsAggsResult,
  AttachmentForDeletion,
  AttackIdsAggsResult,
  BulkOptionalAttributes,
  EventIdsAggsResult,
  GetAllAlertsAttachToCaseArgs as GetAllDocumentsAttachedToCaseArgs,
  CasesWithOwnerOfAttachment,
  GetAttachmentArgs,
  GetCaseIdsByAttachmentIdsAggs,
  GetCaseIdsByAttachmentIdsArgs,
  GetUnifiedAttachmentsByTypesArgs,
  MixSavedObjectResponse,
  OptionalAttributes,
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
import type { AttachmentSavedObjectType } from '../../user_actions/types';
import { partitionByCaseAssociation } from '../../../common/partitioning';
import { findReferenceId, getCaseReferenceId } from '../../../common/references';
import { getExternalReferenceStorage } from '../../../common/attachments/storage_type';
import { EXTERNAL_REFERENCE_REF_NAME } from '../../../common/constants';
import {
  decodeAttachmentSavedObject,
  toUnifiedAttributes,
  type ModeTransformedAttributes,
} from './utils';

/** The field each legacy `cases-comments` type keeps the id of what it attaches in. */
const LEGACY_ATTACHMENT_ID_FIELDS: Readonly<Record<string, string>> = {
  [LEGACY_ALERT_TYPE]: 'alertId',
  [LEGACY_EVENT_TYPE]: 'eventId',
  [LEGACY_EXTERNAL_REFERENCE_TYPE]: 'externalReferenceId',
};

/** The saved object type a legacy external reference attaches, when it attaches one. */
const getReferencedSoType = ({ type, values }: LegacyTypeMatch): string | undefined => {
  const [externalReferenceTypeId] = values ?? [];
  if (type !== LEGACY_EXTERNAL_REFERENCE_TYPE || externalReferenceTypeId == null) return;
  const storage = getExternalReferenceStorage(externalReferenceTypeId);
  return storage.type === ExternalReferenceStorageType.savedObject ? storage.soType : undefined;
};

/** Joins the cases of the same attachment id read from several saved object types. */
const mergeCasesOfAttachments = (
  casesOfAttachments: CasesWithOwnerOfAttachment[]
): CasesWithOwnerOfAttachment[] => {
  const byAttachmentId = new Map<string, Map<string, string>>();
  for (const { attachmentId, cases } of casesOfAttachments) {
    const ownerByCaseId = byAttachmentId.get(attachmentId) ?? new Map<string, string>();
    for (const { id, owner } of cases) ownerByCaseId.set(id, owner);
    byAttachmentId.set(attachmentId, ownerByCaseId);
  }
  return [...byAttachmentId].map(([attachmentId, ownerByCaseId]) => ({
    attachmentId,
    cases: [...ownerByCaseId].map(([id, owner]) => ({ id, owner })),
  }));
};

export class AttachmentGetter {
  constructor(private readonly context: ServiceContext) {}

  public async bulkGet(
    savedObjectIds: string[]
  ): Promise<BulkOptionalAttributes<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments with ids: ${savedObjectIds.join()}`
      );

      const response =
        await this.context.unsecuredSavedObjectsClient.bulkGet<AttachmentAttributesV2>(
          savedObjectIds.flatMap((id) => [
            { id, type: CASE_ATTACHMENT_SAVED_OBJECT },
            { id, type: CASE_COMMENT_SAVED_OBJECT },
          ])
        );

      const merged = this.mergeBulkGetResults(response.saved_objects);

      return this.transformAndDecodeBulkGetResponse(merged);
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments with ids ${savedObjectIds.join()}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Retrieves attachments for deletion. Unlike {@link bulkGet}, a row that fails to decode is
   * returned without `attributes` so it can still be removed. Ids found in neither type are left out.
   */
  public async bulkGetForDeletion(savedObjectIds: string[]): Promise<AttachmentForDeletion[]> {
    return this.getForDeletion(
      savedObjectIds.flatMap((id) => [
        { id, type: CASE_ATTACHMENT_SAVED_OBJECT },
        { id, type: CASE_COMMENT_SAVED_OBJECT },
      ]),
      (savedObjects) => this.mergeBulkGetResults(savedObjects)
    );
  }

  /**
   * Same as {@link bulkGetForDeletion} for attachments whose saved object type is already known,
   * so each id is looked up once.
   */
  public async bulkGetForDeletionByType(
    attachments: Array<{ id: string; type: AttachmentSavedObjectType }>
  ): Promise<AttachmentForDeletion[]> {
    return this.getForDeletion(attachments, (savedObjects) => savedObjects);
  }

  private async getForDeletion(
    objects: Array<{ id: string; type: AttachmentSavedObjectType }>,
    merge: (
      savedObjects: Array<SavedObject<AttachmentAttributesV2> | { id: string; error: unknown }>
    ) => Array<MixSavedObjectResponse>
  ): Promise<AttachmentForDeletion[]> {
    try {
      this.context.log.debug(`Attempting to retrieve ${objects.length} attachments for deletion`);

      const attachments: AttachmentForDeletion[] = [];
      // The chunk size is even, so an id looked up in both types never has its pair split.
      for (const objectsChunk of chunk(objects, MAX_DOCS_PER_PAGE)) {
        const response =
          await this.context.unsecuredSavedObjectsClient.bulkGet<AttachmentAttributesV2>(
            objectsChunk
          );

        for (const so of merge(response.saved_objects)) {
          if (isSOError(so)) {
            const { status, message } = generateCaseErrorResponse(so.error);
            if (status !== 404) {
              throw Boom.boomify(new Error(`Failed to retrieve attachment ${so.id}: ${message}`), {
                statusCode: status,
              });
            }
          } else {
            attachments.push(
              this.toAttachmentForDeletion(so as SavedObject<AttachmentPersistedAttributes>)
            );
          }
        }
      }

      return attachments;
    } catch (error) {
      this.context.log.error(
        `Error retrieving ${objects.length} attachments for deletion: ${error}`
      );
      throw error;
    }
  }

  private toAttachmentForDeletion(
    so: SavedObject<AttachmentPersistedAttributes> | SavedObject<UnifiedAttachmentAttributes>
  ): AttachmentForDeletion {
    const { id, type, references, version } = so;
    const attributes = this.injectForDeletion(so);
    const { owner: rawOwner }: Record<string, unknown> = attributes;
    const attachment = {
      id,
      type: type as AttachmentSavedObjectType,
      owner: typeof rawOwner === 'string' && rawOwner.length > 0 ? rawOwner : undefined,
      references,
      fileId: getStoredFileId(attributes),
      version,
    };

    try {
      const transformed = toUnifiedAttributes({ attributes });

      return {
        ...attachment,
        attributes: transformed.isUnified
          ? transformed.attributes
          : decodeOrThrowZod(AttachmentTransformedAttributesSchema)(transformed.attributes),
      };
    } catch (error) {
      this.context.log.warn(`Attachment ${id} failed to decode: ${error}`);
      return attachment;
    }
  }

  /** Restores the fields kept in references (e.g. a legacy file id), or keeps the stored ones. */
  private injectForDeletion(
    so: SavedObject<AttachmentPersistedAttributes> | SavedObject<UnifiedAttachmentAttributes>
  ): AttachmentAttributesV2 {
    try {
      return (
        injectAttachmentSOAttributesFromRefs(
          so as SavedObject<AttachmentPersistedAttributes>
        ) as SavedObject<AttachmentAttributesV2>
      ).attributes;
    } catch (error) {
      this.context.log.warn(`Attachment ${so.id} failed to restore its reference fields: ${error}`);
      return so.attributes as AttachmentAttributesV2;
    }
  }

  private mergeBulkGetResults(
    savedObjects: Array<SavedObject<AttachmentAttributesV2> | { id: string; error: unknown }>
  ): Array<MixSavedObjectResponse> {
    // We query 2 SO types per id (paired in bulkGet input order): one may hit,
    // one may 404. For ids missing from both types both entries are errors; we
    // surface a single "not found" from the FF-derived default write target so
    // the error message stays consistent with where new writes go.
    if (savedObjects.length % 2 !== 0) {
      throw new Error(
        `Expected bulkGet response to contain pairs of saved objects, received ${savedObjects.length} entries`
      );
    }

    const defaultSavedObjectType = getAttachmentSavedObjectType(this.context.config);
    const result: Array<MixSavedObjectResponse> = [];
    for (let i = 0; i < savedObjects.length; i += 2) {
      const pair = [savedObjects[i], savedObjects[i + 1]] as const;
      if (pair[0].id !== pair[1].id) {
        throw new Error(
          `bulkGet response pair mismatch: expected matching ids, received "${pair[0].id}" and "${pair[1].id}"`
        );
      }
      const hit = pair.find((so) => !isSOError(so));
      if (hit) {
        result.push(hit);
      } else {
        // Both buckets are errors. Surface the one matching the FF-derived
        // default write target so callers see a consistent "not found"
        // (cases-comments when FF off, cases-attachments when FF on).
        const [unifiedSO, legacySO] = pair;
        result.push(defaultSavedObjectType === CASE_ATTACHMENT_SAVED_OBJECT ? unifiedSO : legacySO);
      }
    }
    return result;
  }

  // cases-comments documents with a unified mapping fold to unified via toUnifiedAttributes;
  // the rest are surfaced as per-item errors (see toUnrecognizedTypeError).
  private transformAndDecodeBulkGetResponse(
    merged: Array<MixSavedObjectResponse>
  ): BulkOptionalAttributes<AttachmentAttributesV2> {
    const validatedAttachments: Array<OptionalAttributes<AttachmentAttributesV2>> = [];

    for (const so of merged) {
      if (isSOError(so)) {
        validatedAttachments.push(so as unknown as AttachmentSavedObjectTransformedV2);
      } else {
        const injectedSo = injectAttachmentAttributesAndHandleErrors(
          so as SavedObject<AttachmentPersistedAttributes>
        ) as SavedObject<AttachmentAttributesV2>;
        let transformed: ModeTransformedAttributes | undefined;
        let decodeError: unknown;
        try {
          transformed = toUnifiedAttributes({
            attributes: injectedSo.attributes,
          });
        } catch (error) {
          decodeError = error;
        }
        if (transformed?.isUnified) {
          validatedAttachments.push(
            Object.assign(injectedSo, {
              attributes: transformed.attributes,
            }) as AttachmentSavedObjectTransformedV2
          );
        } else {
          validatedAttachments.push(this.toUnrecognizedTypeError(injectedSo, decodeError));
        }
      }
    }

    return {
      saved_objects: validatedAttachments,
    };
  }

  // Only `bulkGet` has an errors channel; get/flatten fall back to legacy instead, and the deletion
  // reads return the row without attributes.
  // A unified cross-path policy for unmapped types is a tracked follow-up.
  private toUnrecognizedTypeError(
    injectedSo: SavedObject<AttachmentAttributesV2>,
    decodeError?: unknown
  ): OptionalAttributes<AttachmentAttributesV2> {
    const attachmentType = getAttachmentTypeFromAttributes(injectedSo.attributes);
    const decodeReason = decodeError instanceof Error ? decodeError.message : String(decodeError);
    const reason =
      decodeError === undefined
        ? 'has no unified mapping'
        : `failed unified decode: ${decodeReason}`;
    this.context.log.warn(
      `Attachment ${injectedSo.id} has attachment type "${attachmentType}" (owner: "${injectedSo.attributes.owner}"), which ${reason}. Returning it as an error instead of a legacy fallback.`
    );

    return {
      id: injectedSo.id,
      type: injectedSo.type,
      references: injectedSo.references,
      error: {
        error: 'Bad Request',
        message:
          decodeError === undefined
            ? `Attachment type "${attachmentType}" is not recognized.`
            : `Attachment type "${attachmentType}" failed validation: ${decodeReason}`,
        statusCode: 400,
      },
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

      const idTypePairs: Array<{ id: string; type: AttachmentSavedObjectType }> = [];
      for await (const attachmentSavedObject of finder.find()) {
        idTypePairs.push(
          ...attachmentSavedObject.saved_objects.map((attachment) => ({
            id: attachment.id,
            type: attachment.type as AttachmentSavedObjectType,
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
    unifiedAttachmentTypes = [],
    owner,
  }: GetAllDocumentsAttachedToCaseArgs): Promise<
    Array<SavedObject<DocumentAttachmentAttributesV2>>
  > {
    try {
      this.context.log.debug(`Attempting to GET all documents for case id ${caseId}`);
      const legacyDocumentsFilter = buildFilter({
        filters: attachmentTypes,
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const unifiedDocumentsFilter = buildFilter({
        filters: [
          ...attachmentTypes.map((type) => toUnifiedAttachmentType(type, owner)),
          ...unifiedAttachmentTypes,
        ],
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([
        combineFilters([legacyDocumentsFilter, unifiedDocumentsFilter], NodeBuilderOperators.or),
        filter,
      ]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<AttachmentAttributesV2>({
          type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
          hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
          sortField: 'created_at',
          sortOrder: 'asc',
          filter: combinedFilter,
          perPage: MAX_DOCS_PER_PAGE,
        });

      let result: Array<SavedObject<DocumentAttachmentAttributesV2>> = [];
      for await (const userActionSavedObject of finder.find()) {
        result = result.concat(this.decodeDocuments(userActionSavedObject));
      }

      return result;
    } catch (error) {
      this.context.log.error(`Error on GET all documents for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  private decodeDocuments(
    response: SavedObjectsFindResponse<AttachmentAttributesV2>
  ): Array<SavedObject<DocumentAttachmentAttributesV2>> {
    const decoded: Array<SavedObject<DocumentAttachmentAttributesV2>> = [];

    for (const so of response.saved_objects) {
      try {
        const validatedAttributes = decodeOrThrowZod(DocumentAttachmentAttributesSchemaV2)(
          so.attributes
        );
        decoded.push(Object.assign(so, { attributes: validatedAttributes }));
      } catch (error) {
        this.context.log.warn(
          `Failed to decode document attachment id ${so.id} of type ${so.type}, skipping it: ${error}`
        );
      }
    }

    return decoded;
  }

  /**
   * Retrieves unified attachments of the given `types`, preserving full metadata
   * (unlike {@link getAllDocumentsAttachedToCase}, which only keeps alert/event fields).
   */
  public async getUnifiedAttachmentsByTypes({
    caseId,
    types,
    filter,
  }: GetUnifiedAttachmentsByTypesArgs): Promise<Array<SavedObject<UnifiedAttachmentAttributes>>> {
    if (types.length === 0) {
      return [];
    }

    try {
      this.context.log.debug(
        `Attempting to GET unified attachments [${types.join(', ')}] for case id ${caseId}`
      );

      const typeFilter = buildFilter({
        filters: types,
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      });
      const combinedFilter = combineFilters([typeFilter, filter]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<UnifiedAttachmentAttributes>(
          {
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            sortField: 'created_at',
            sortOrder: 'asc',
            filter: combinedFilter,
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      let result: Array<SavedObject<UnifiedAttachmentAttributes>> = [];
      for await (const page of finder.find()) {
        result = result.concat(this.decodeUnifiedAttachments(page));
      }

      return result;
    } catch (error) {
      this.context.log.error(
        `Error on GET unified attachments [${types.join(', ')}] for case id ${caseId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Decodes each attachment individually and skips (with a warning) any that fail: unlike
   * {@link decodeDocuments}, callers of this method (e.g. case metrics) can still return
   * useful data derived from the other attachments, so one non-conforming `security.entity`
   * document shouldn't fail the whole call.
   */
  private decodeUnifiedAttachments(
    response: SavedObjectsFindResponse<UnifiedAttachmentAttributes>
  ): Array<SavedObject<UnifiedAttachmentAttributes>> {
    const decoded: Array<SavedObject<UnifiedAttachmentAttributes>> = [];

    for (const so of response.saved_objects) {
      try {
        const validatedAttributes = decodeOrThrowZod(UnifiedAttachmentAttributesSchema)(
          so.attributes
        ) as UnifiedAttachmentAttributes;
        decoded.push(Object.assign(so, { attributes: validatedAttributes }));
      } catch (error) {
        this.context.log.warn(
          `Failed to decode unified attachment id ${so.id} of type ${so.type}, skipping it: ${error}`
        );
      }
    }

    return decoded;
  }

  /**
   * The cases each attachment id is attached to, with their owners. Attachment ids in no case are
   * left out. Reads `cases-attachments`, and the `cases-comments` rows of the type's legacy form,
   * if it has one that stores the id.
   */
  public async getCaseIdsByAttachmentIds({
    type,
    attachmentIds: requestedIds,
    unifiedFilter,
    legacyFilter,
  }: GetCaseIdsByAttachmentIdsArgs): Promise<CasesWithOwnerOfAttachment[]> {
    const attachmentIds = [...new Set(requestedIds)];
    try {
      this.context.log.debug(
        `Attempting to GET cases for attachment ids ${attachmentIds.join(', ')}`
      );

      const legacyMatches = toLegacyTypeMatches(type).filter((match) =>
        Object.hasOwn(LEGACY_ATTACHMENT_ID_FIELDS, match.type)
      );
      const responses = await Promise.all([
        this.findCasesOfAttachmentIds({
          soType: CASE_ATTACHMENT_SAVED_OBJECT,
          idField: 'attachmentId',
          attachmentIds,
          filter: combineFilters([
            buildFilter({
              filters: [type],
              field: 'type',
              operator: 'or',
              type: CASE_ATTACHMENT_SAVED_OBJECT,
            }),
            unifiedFilter,
          ]),
        }),
        ...legacyMatches.map((match) => {
          const legacyMatchFilter = combineFilters([commentsMatchFilter(match), legacyFilter]);
          const referencedSoType = getReferencedSoType(match);
          return referencedSoType
            ? this.findCasesOfReferencedIds({
                referencedSoType,
                attachmentIds,
                filter: legacyMatchFilter,
              })
            : this.findCasesOfAttachmentIds({
                soType: CASE_COMMENT_SAVED_OBJECT,
                idField: LEGACY_ATTACHMENT_ID_FIELDS[match.type],
                attachmentIds,
                filter: legacyMatchFilter,
              });
        }),
      ]);

      return mergeCasesOfAttachments(responses.flat());
    } catch (error) {
      this.context.log.error(
        `Error on GET cases for attachment ids ${attachmentIds.join(', ')}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Legacy rows that store what they attach as a saved object keep its id only in their
   * references, which a find can't filter or aggregate on, so their rows are read.
   */
  private async findCasesOfReferencedIds({
    referencedSoType,
    attachmentIds,
    filter,
  }: {
    referencedSoType: string;
    attachmentIds: string[];
    filter?: KueryNode;
  }): Promise<CasesWithOwnerOfAttachment[]> {
    const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<{
      owner: string;
    }>({
      type: CASE_COMMENT_SAVED_OBJECT,
      hasReference: attachmentIds.map((id) => ({ type: referencedSoType, id })),
      fields: ['owner'],
      filter,
      perPage: MAX_DOCS_PER_PAGE,
    });

    const casesOfAttachments: CasesWithOwnerOfAttachment[] = [];
    for await (const { saved_objects: attachments } of finder.find()) {
      for (const { references, attributes } of attachments) {
        const attachmentId = findReferenceId(
          EXTERNAL_REFERENCE_REF_NAME,
          referencedSoType,
          references
        );
        const caseId = getCaseReferenceId(references);
        if (attachmentId != null && caseId != null) {
          casesOfAttachments.push({
            attachmentId,
            cases: [{ id: caseId, owner: attributes.owner }],
          });
        }
      }
    }
    return casesOfAttachments;
  }

  private async findCasesOfAttachmentIds({
    soType,
    idField,
    attachmentIds,
    filter,
  }: {
    soType: typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT;
    idField: string;
    attachmentIds: string[];
    filter?: KueryNode;
  }): Promise<CasesWithOwnerOfAttachment[]> {
    const attributes = `${soType}.attributes`;
    const response = await this.context.unsecuredSavedObjectsClient.find<
      unknown,
      GetCaseIdsByAttachmentIdsAggs
    >({
      type: soType,
      page: 1,
      perPage: 0,
      aggs: {
        attachmentIds: {
          terms: {
            field: `${attributes}.${idField}`,
            size: attachmentIds.length,
            // An attachment can hold many ids; its other ids must not take the requested ones' buckets.
            include: attachmentIds,
          },
          aggs: {
            references: {
              nested: { path: `${soType}.references` },
              aggregations: {
                // Saved-object-backed attachments also reference their target, e.g. a dashboard.
                cases: {
                  filter: { term: { [`${soType}.references.type`]: CASE_SAVED_OBJECT } },
                  aggregations: {
                    caseIds: {
                      terms: {
                        field: `${soType}.references.id`,
                        // Caps the cases of each attachment id; ES leaves the rest out silently, so
                        // more than this is an error rather than a partial list.
                        size: MAX_DOCS_PER_PAGE,
                      },
                      aggregations: {
                        // An attachment has its case's owner, so the case is authorized without reading it.
                        attachment: {
                          reverse_nested: {},
                          aggregations: {
                            owner: { terms: { field: `${attributes}.owner`, size: 1 } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      filter: combineFilters([
        buildFilter({ filters: attachmentIds, field: idField, operator: 'or', type: soType }),
        filter,
      ]),
    });

    return (response.aggregations?.attachmentIds.buckets ?? []).map(({ key, references }) => {
      const { buckets, sum_other_doc_count: casesLeftOut } = references.cases.caseIds;
      if (casesLeftOut > 0) {
        throw new Error(`Attachment id ${key} is in more than ${MAX_DOCS_PER_PAGE} cases`);
      }
      return {
        attachmentId: key,
        cases: buckets.flatMap(({ key: id, attachment }) =>
          attachment.owner.buckets.map(({ key: owner }) => ({ id, owner }))
        ),
      };
    });
  }

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertIds({ caseId }: { caseId: string }): Promise<Set<string>> {
    try {
      this.context.log.debug(`Attempting to GET all alerts ids for case id ${caseId}`);
      const legacyFindPromise = this.context.unsecuredSavedObjectsClient.find<
        unknown,
        AlertIdsAggsResult
      >({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: buildFilter({
          filters: [AttachmentType.alert],
          field: 'type',
          operator: 'or',
          type: CASE_COMMENT_SAVED_OBJECT,
        }),
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

      const unifiedFindPromise = this.context.unsecuredSavedObjectsClient.find<
        unknown,
        AlertIdsAggsResult
      >({
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        filter: buildFilter({
          filters: UNIFIED_ALERT_TYPES_ARRAY,
          field: 'type',
          operator: 'or',
          type: CASE_ATTACHMENT_SAVED_OBJECT,
        }),
        perPage: 0,
        aggs: {
          alertIds: {
            terms: {
              field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId`,
              size: MAX_ALERTS_PER_CASE,
            },
          },
        },
      });

      const [legacyRes, unifiedRes] = await Promise.all([legacyFindPromise, unifiedFindPromise]);

      const legacyAlertIds =
        legacyRes.aggregations?.alertIds.buckets.map((bucket) => bucket.key) ?? [];
      const unifiedAlertIds =
        unifiedRes.aggregations?.alertIds.buckets.map((bucket) => bucket.key) ?? [];

      return new Set([...legacyAlertIds, ...unifiedAlertIds]);
    } catch (error) {
      this.context.log.error(`Error on GET all alerts ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Returns the subset of `attackIds` that is already attached to a case.
   */
  public async getAttachedAttackIds({
    caseId,
    attackIds,
  }: {
    caseId: string;
    attackIds: string[];
  }): Promise<Set<string>> {
    const requestedIds = [...new Set(attackIds)];
    if (requestedIds.length === 0) {
      return new Set();
    }

    try {
      this.context.log.debug(`Attempting to GET attached attack ids for case id ${caseId}`);

      // Attacks have no legacy `cases-comments` shape to union in, and filtering on the requested
      // ids bounds the aggregation by the request rather than by the attacks on the case.
      const res = await this.context.unsecuredSavedObjectsClient.find<unknown, AttackIdsAggsResult>(
        {
          type: CASE_ATTACHMENT_SAVED_OBJECT,
          hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
          filter: combineFilters(
            [
              buildFilter({
                filters: [SECURITY_ATTACK_ATTACHMENT_TYPE],
                field: 'type',
                operator: 'or',
                type: CASE_ATTACHMENT_SAVED_OBJECT,
              }),
              buildFilter({
                filters: requestedIds,
                field: 'attachmentId',
                operator: 'or',
                type: CASE_ATTACHMENT_SAVED_OBJECT,
              }),
            ],
            NodeBuilderOperators.and
          ),
          perPage: 0,
          aggs: {
            attackIds: {
              terms: {
                field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId`,
                size: requestedIds.length,
              },
            },
          },
        }
      );

      return new Set(res.aggregations?.attackIds.buckets.map((bucket) => bucket.key) ?? []);
    } catch (error) {
      this.context.log.error(`Error on GET attached attack ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves all the events attached to a case.
   */
  public async getAllEventIds({
    caseId,
    owner,
  }: {
    caseId: string;
    owner: string;
  }): Promise<Set<string>> {
    try {
      this.context.log.debug(`Attempting to GET all event ids for case id ${caseId}`);
      const legacyEventsFilter = buildFilter({
        filters: [AttachmentType.event],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });
      const unifiedEventsFilter = buildFilter({
        filters: [toUnifiedAttachmentType(AttachmentType.event, owner)],
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      });
      const eventsFilter = combineFilters(
        [legacyEventsFilter, unifiedEventsFilter],
        NodeBuilderOperators.or
      );

      const res = await this.context.unsecuredSavedObjectsClient.find<unknown, EventIdsAggsResult>({
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: eventsFilter,
        perPage: 0,
        aggs: {
          legacyEventIds: {
            terms: {
              field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.eventId`,
              size: MAX_ALERTS_PER_CASE,
            },
          },
          unifiedEventIds: {
            terms: {
              field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId`,
              size: MAX_ALERTS_PER_CASE,
            },
          },
        },
      });

      const legacyEventIds =
        res.aggregations?.legacyEventIds.buckets.map((bucket) => bucket.key) ?? [];
      const unifiedEventIds =
        res.aggregations?.unifiedEventIds.buckets.map((bucket) => bucket.key) ?? [];
      const eventIds = [...legacyEventIds, ...unifiedEventIds];
      return new Set(eventIds);
    } catch (error) {
      this.context.log.error(`Error on GET all event ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async get({
    savedObjectId,
  }: GetAttachmentArgs): Promise<AttachmentSavedObjectTransformedV2> {
    const res = await this.getStoredAttachment(savedObjectId);

    try {
      return decodeAttachmentSavedObject(res as SavedObject<AttachmentPersistedAttributes>);
    } catch (error) {
      this.context.log.warn(`Failed to decode attachment ${savedObjectId}: ${error}`);
      throw Boom.notFound(`Attachment ${savedObjectId} could not be read.`);
    }
  }

  private async getStoredAttachment(
    savedObjectId: string
  ): Promise<
    SavedObject<UnifiedAttachmentAttributes> | SavedObject<AttachmentPersistedAttributes>
  > {
    try {
      this.context.log.debug(`Attempting to GET attachment ${savedObjectId}`);

      // Try unified first; fall back to cases-comments on 404 for leftover rows.
      try {
        return await this.context.unsecuredSavedObjectsClient.get<UnifiedAttachmentAttributes>(
          CASE_ATTACHMENT_SAVED_OBJECT,
          savedObjectId
        );
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
          throw error;
        }
        this.context.log.debug(
          `Attachment ${savedObjectId} not found in ${CASE_ATTACHMENT_SAVED_OBJECT}, falling back to ${CASE_COMMENT_SAVED_OBJECT}`
        );
        return await this.context.unsecuredSavedObjectsClient.get<AttachmentPersistedAttributes>(
          CASE_COMMENT_SAVED_OBJECT,
          savedObjectId
        );
      }
    } catch (error) {
      this.context.log.error(`Error on GET attachment ${savedObjectId}: ${error}`);
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

    const unifiedStatsByCase = await this.getUnifiedAttachmentStatsByCaseId(caseIds);
    for (const [caseId, unifiedStats] of unifiedStatsByCase) {
      const existing = statsMap.get(caseId);
      if (existing) {
        statsMap.set(caseId, {
          ...existing,
          userComments: existing.userComments + unifiedStats.userComments,
          alerts: existing.alerts + unifiedStats.alerts,
          events: existing.events + unifiedStats.events,
        });
      } else {
        statsMap.set(caseId, {
          userComments: unifiedStats.userComments,
          alerts: unifiedStats.alerts,
          events: unifiedStats.events,
        });
      }
    }

    return statsMap;
  }

  private async getUnifiedAttachmentStatsByCaseId(
    caseIds: string[]
  ): Promise<Map<string, Pick<AttachmentTotals, 'userComments' | 'events' | 'alerts'>>> {
    interface UnifiedAttachmentAggs {
      refs: {
        caseIds: {
          buckets: Array<{
            key: string;
            reverse: {
              comments: { doc_count: number };
              events: { eventIds: { value: number } };
              alerts: {
                buckets: Record<string, { alertIds: { value: number } }>;
              };
            };
          }>;
        };
      };
    }
    const alertTypeFilters = UNIFIED_ALERT_TYPES_ARRAY.reduce<
      Record<string, { term: Record<string, string> }>
    >((acc, alertType) => {
      acc[alertType] = {
        term: {
          [`${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.type`]: alertType,
        },
      };
      return acc;
    }, {});
    const res = await this.context.unsecuredSavedObjectsClient.find<unknown, UnifiedAttachmentAggs>(
      {
        hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
        hasReferenceOperator: 'OR',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        perPage: 0,
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
                aggregations: {
                  reverse: {
                    reverse_nested: {},
                    aggregations: {
                      comments: {
                        filter: {
                          term: {
                            [`${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.type`]:
                              COMMENT_ATTACHMENT_TYPE,
                          },
                        },
                      },
                      events: {
                        filter: {
                          term: {
                            [`${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.type`]:
                              SECURITY_EVENT_ATTACHMENT_TYPE,
                          },
                        },
                        aggregations: {
                          eventIds: {
                            cardinality: {
                              field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId`,
                            },
                          },
                        },
                      },
                      alerts: {
                        filters: {
                          filters: alertTypeFilters,
                        },
                        aggregations: {
                          alertIds: {
                            cardinality: {
                              field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId`,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }
    );

    const byCase = new Map<string, Pick<AttachmentTotals, 'userComments' | 'events' | 'alerts'>>();
    const buckets = res.aggregations?.refs?.caseIds?.buckets ?? [];
    for (const bucket of buckets) {
      const alertBuckets = bucket.reverse.alerts?.buckets ?? {};
      const alertCount = Object.values(alertBuckets).reduce(
        (sum, typeBucket) => sum + (typeBucket?.alertIds?.value ?? 0),
        0
      );
      byCase.set(bucket.key, {
        userComments: bucket.reverse.comments.doc_count,
        events: bucket.reverse.events.eventIds.value,
        alerts: alertCount,
      });
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

  /** Finds the attachments of the case that reference the files, read for deletion. */
  public async getFileAttachmentsForDeletion({
    caseId,
    fileIds,
  }: {
    caseId: string;
    fileIds: string[];
  }): Promise<AttachmentForDeletion[]> {
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
      const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<
        AttachmentPersistedAttributes | UnifiedAttachmentAttributes
      >({
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
        hasReference: references,
        sortField: 'created_at',
        sortOrder: 'asc',
        perPage: MAX_DOCS_PER_PAGE,
      });

      const fileAttachments: AttachmentForDeletion[] = [];

      for await (const { saved_objects: savedObjects } of finder.find()) {
        const [validFileAttachments, invalidFileAttachments] = partitionByCaseAssociation(
          caseId,
          savedObjects
        );

        this.logInvalidFileAssociations(invalidFileAttachments, fileIds, caseId);
        fileAttachments.push(
          ...validFileAttachments.map((so) =>
            this.toAttachmentForDeletion(so as SavedObject<AttachmentPersistedAttributes>)
          )
        );
      }

      return fileAttachments;
    } catch (error) {
      this.context.log.error(`Error retrieving file attachments file ids: ${fileIds}: ${error}`);
      throw error;
    }
  }

  /** Finds the attachments of the case that match the filter, read for deletion. */
  public async getCaseAttachmentsForDeletion({
    caseId,
    filter,
  }: {
    caseId: string;
    filter?: KueryNode;
  }): Promise<AttachmentForDeletion[]> {
    try {
      this.context.log.debug(`Attempting to find attachments for deletion on case ${caseId}`);

      const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<
        AttachmentPersistedAttributes | UnifiedAttachmentAttributes
      >({
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter,
        perPage: MAX_DOCS_PER_PAGE,
      });

      const attachments: AttachmentForDeletion[] = [];

      for await (const { saved_objects: savedObjects } of finder.find()) {
        attachments.push(
          ...savedObjects.map((so) =>
            this.toAttachmentForDeletion(so as SavedObject<AttachmentPersistedAttributes>)
          )
        );
      }

      return attachments;
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments for deletion on case ${caseId}: ${error}`
      );
      throw error;
    }
  }

  private logInvalidFileAssociations(
    attachments: Array<SavedObject<unknown>>,
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

/** Reads the file id off the stored fields, so it is found even when the row fails to decode. */
const getStoredFileId = (attributes: AttachmentAttributesV2 | undefined): string | undefined => {
  const {
    type,
    attachmentId,
    externalReferenceAttachmentTypeId,
    externalReferenceId,
  }: Record<string, unknown> = attributes ?? {};

  if (type === FILE_ATTACHMENT_TYPE && typeof attachmentId === 'string') {
    return attachmentId;
  }

  if (
    type === LEGACY_EXTERNAL_REFERENCE_TYPE &&
    externalReferenceAttachmentTypeId === LEGACY_FILE_ATTACHMENT_TYPE &&
    typeof externalReferenceId === 'string'
  ) {
    return externalReferenceId;
  }
};
