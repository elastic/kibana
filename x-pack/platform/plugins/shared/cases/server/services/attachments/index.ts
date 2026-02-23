/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type {
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression } from '@kbn/es-query';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';
import { AttachmentType } from '../../../common/types/domain';
import {
  UnifiedAttachmentAttributesRt,
  AttachmentAttributesRtV2,
} from '../../../common/types/domain/attachment/v2';
import { decodeOrThrow } from '../../common/runtime_types';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  FILE_ATTACHMENT_TYPE,
} from '../../../common/constants';
import { getAttachmentSavedObjectType, resolveAttachmentSavedObjectType } from './utils';
import {
  getAttachmentTypeFromAttributes,
  getAttachmentTypeTransformer,
} from './schema_transformer';

import {
  attachmentFindOptionsToSearchParams,
  buildFilter,
  combineFilters,
} from '../../client/utils';
import { defaultSortField } from '../../common/utils';
import type { AggregationResponse } from '../../client/metrics/types';
import {
  extractAttachmentSORefsFromAttributes,
  injectAttachmentSOAttributesFromRefs,
  injectAttachmentSOAttributesFromRefsForPatch,
} from '../so_references';
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
  UpdateArgs,
} from './types';
import { AttachmentGetter } from './operations/get';
import type {
  AttachmentPersistedAttributes,
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../common/types/attachments_v1';
import {
  AttachmentTransformedAttributesRt,
  AttachmentPartialAttributesRt,
} from '../../common/types/attachments_v1';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentAttributes,
  UnifiedAttachmentSavedObjectTransformed,
} from '../../common/types/attachments_v2';
import { isSOError } from '../../common/error';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';

export class AttachmentService {
  private readonly _getter: AttachmentGetter;

  constructor(private readonly context: ServiceContext) {
    this._getter = new AttachmentGetter(context);
  }

  public get getter() {
    return this._getter;
  }

  private async getAttachmentSavedObjectType(
    attachmentId: string
  ): Promise<typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT | null> {
    return resolveAttachmentSavedObjectType(this.context.unsecuredSavedObjectsClient, attachmentId);
  }

  public async countAlertsAttachedToCase(
    params: AlertsAttachedToCaseArgs
  ): Promise<number | undefined> {
    try {
      this.context.log.debug(`Attempting to count alerts for case id ${params.caseId}`);
      const res = await this.executeCaseAggregations<{ alerts: { value: number } }>({
        ...params,
        attachmentType: AttachmentType.alert,
        aggregations: this.buildAlertsAggs(),
      });

      return res?.alerts?.value;
    } catch (error) {
      this.context.log.error(`Error while counting alerts for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  private buildAlertsAggs(): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      alerts: {
        cardinality: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
        },
      },
    };
  }

  /**
   * Executes the aggregations against a type of attachment attached to a case.
   */
  public async executeCaseAggregations<Agg extends AggregationResponse = AggregationResponse>({
    caseId,
    filter,
    aggregations,
    attachmentType,
  }: AttachmentsAttachedToCaseArgs): Promise<Agg | undefined> {
    try {
      this.context.log.debug(`Attempting to aggregate for case id ${caseId}`);
      const attachmentFilter = buildFilter({
        filters: attachmentType,
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([attachmentFilter, filter]);

      const response = await this.context.unsecuredSavedObjectsClient.find<unknown, Agg>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: aggregations,
        filter: combinedFilter,
      });

      return response.aggregations;
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

      const typeFilter = buildFilter({
        filters: [AttachmentType.persistableState, AttachmentType.externalReference],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const excludeFilesFilter = fromKueryExpression(
        `not ${CASE_COMMENT_SAVED_OBJECT}.attributes.externalReferenceAttachmentTypeId: ${FILE_ATTACHMENT_TYPE}`
      );

      const combinedFilter = combineFilters([typeFilter, excludeFilesFilter]);

      const response = await this.context.unsecuredSavedObjectsClient.find<{ total: number }>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        filter: combinedFilter,
      });

      return response.total;
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

  public async bulkDelete({ attachmentIds, refresh }: DeleteAttachmentArgs) {
    try {
      if (attachmentIds.length <= 0) {
        return;
      }

      this.context.log.debug(`Attempting to DELETE attachments ${attachmentIds}`);
      // Delete from both SO types to handle attachments in either location
      // If an attachment doesn't exist in one type, it will be ignored
      const deleteRequests = attachmentIds.flatMap((id) => [
        { id, type: CASE_ATTACHMENT_SAVED_OBJECT },
        { id, type: CASE_COMMENT_SAVED_OBJECT },
      ]);

      await this.context.unsecuredSavedObjectsClient.bulkDelete(deleteRequests, {
        refresh,
      });
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
    owner,
  }: CreateAttachmentArgs): Promise<
    AttachmentSavedObjectTransformed | UnifiedAttachmentSavedObjectTransformed
  > {
    try {
      this.context.log.debug(`Attempting to POST a new comment`);

      const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(attributes);
      const savedObjectType = getAttachmentSavedObjectType(this.context.config);

      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const transformer = getAttachmentTypeTransformer(
          getAttachmentTypeFromAttributes(decodedAttributes)
        );
        const unifiedAttributes = transformer.toNewSchema(decodedAttributes);
        const unifiedAttachment =
          await this.context.unsecuredSavedObjectsClient.create<UnifiedAttachmentAttributes>(
            CASE_ATTACHMENT_SAVED_OBJECT,
            unifiedAttributes,
            {
              references,
              id,
              refresh,
            }
          );
        const validatedAttributes = decodeOrThrow(UnifiedAttachmentAttributesRt)(
          unifiedAttachment.attributes
        );
        return Object.assign(unifiedAttachment, { attributes: validatedAttributes });
      }

      const transformer = getAttachmentTypeTransformer(
        getAttachmentTypeFromAttributes(decodedAttributes)
      );
      const legacyAttributes = transformer.toOldSchema(decodedAttributes, owner);
      const { attributes: extractedAttributes, references: extractedReferences } =
        extractAttachmentSORefsFromAttributes(
          legacyAttributes,
          references,
          this.context.persistableStateAttachmentTypeRegistry
        );

      const attachment =
        await this.context.unsecuredSavedObjectsClient.create<AttachmentPersistedAttributes>(
          CASE_COMMENT_SAVED_OBJECT,
          extractedAttributes,
          {
            references: extractedReferences,
            id,
            refresh,
          }
        );

      const transformedAttachment = injectAttachmentSOAttributesFromRefs(
        attachment,
        this.context.persistableStateAttachmentTypeRegistry
      );

      const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
        transformedAttachment.attributes
      );

      return Object.assign(transformedAttachment, { attributes: validatedAttributes });
    } catch (error) {
      this.context.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({
    attachments,
    refresh,
    owner,
  }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(`Attempting to bulk create attachments`);

      const savedObjectType = getAttachmentSavedObjectType(this.context.config);
      this.context.log.info(`Saved object type: ${savedObjectType}`);

      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const res =
          await this.context.unsecuredSavedObjectsClient.bulkCreate<UnifiedAttachmentAttributes>(
            attachments.map((attachment) => {
              const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
                attachment.attributes
              );
              const transformer = getAttachmentTypeTransformer(
                getAttachmentTypeFromAttributes(decodedAttributes)
              );
              const attributesToWrite = transformer.toNewSchema(decodedAttributes);

              return {
                type: CASE_ATTACHMENT_SAVED_OBJECT,
                ...attachment,
                attributes: attributesToWrite,
              };
            }),
            { refresh }
          );
        return this.transformAndDecodeBulkCreateResponse(res);
      }

      const res =
        await this.context.unsecuredSavedObjectsClient.bulkCreate<AttachmentPersistedAttributes>(
          attachments.map((attachment) => {
            const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
              attachment.attributes
            );

            const transformer = getAttachmentTypeTransformer(
              getAttachmentTypeFromAttributes(decodedAttributes)
            );
            const attributesToWrite = transformer.toOldSchema(decodedAttributes, owner);
            const { attributes: extractedAttributes, references: extractedReferences } =
              extractAttachmentSORefsFromAttributes(
                attributesToWrite,
                attachment.references,
                this.context.persistableStateAttachmentTypeRegistry
              );

            return {
              type: CASE_COMMENT_SAVED_OBJECT,
              ...attachment,
              attributes: extractedAttributes,
              references: extractedReferences,
            };
          }),
          { refresh }
        );
      return this.transformAndDecodeBulkCreateResponse(res);
    } catch (error) {
      this.context.log.error(`Error on bulk create attachments: ${error}`);
      throw error;
    }
  }

  private transformAndDecodeBulkCreateResponse(
    res: SavedObjectsBulkResponse<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
  ): SavedObjectsBulkResponse<AttachmentAttributesV2> {
    const validatedAttachments: Array<
      AttachmentSavedObjectTransformed | UnifiedAttachmentSavedObjectTransformed
    > = [];

    for (const so of res.saved_objects) {
      if (isSOError(so)) {
        validatedAttachments.push(so as AttachmentSavedObjectTransformed);
      } else if (so.type === CASE_ATTACHMENT_SAVED_OBJECT) {
        const validatedAttributes = decodeOrThrow(UnifiedAttachmentAttributesRt)(so.attributes);
        validatedAttachments.push(Object.assign(so, { attributes: validatedAttributes }));
      } else {
        const transformedAttachment = injectAttachmentSOAttributesFromRefs(
          so,
          this.context.persistableStateAttachmentTypeRegistry
        );

        const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
          transformedAttachment.attributes
        );

        validatedAttachments.push(Object.assign(so, { attributes: validatedAttributes }));
      }
    }

    return Object.assign(res, { saved_objects: validatedAttachments });
  }

  public async update({
    attachmentId,
    updatedAttributes,
    options,
    owner,
  }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(`Attempting to UPDATE attachment ${attachmentId}`);

      const soType = await this.getAttachmentSavedObjectType(attachmentId);
      if (soType === null) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }

      const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(updatedAttributes);

      if (soType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const transformer = getAttachmentTypeTransformer(
          getAttachmentTypeFromAttributes(decodedAttributes)
        );
        const unifiedAttributes = transformer.toNewSchema(decodedAttributes);

        const res =
          await this.context.unsecuredSavedObjectsClient.update<UnifiedAttachmentAttributes>(
            CASE_ATTACHMENT_SAVED_OBJECT,
            attachmentId,
            unifiedAttributes,
            { ...options }
          );
        return Object.assign(res, { attributes: decodedAttributes });
      }

      const transformer = getAttachmentTypeTransformer(
        getAttachmentTypeFromAttributes(decodedAttributes)
      );
      const legacyAttributes = transformer.toOldSchema(decodedAttributes, owner);
      const {
        attributes: extractedAttributes,
        references: extractedReferences,
        didDeleteOperation,
      } = extractAttachmentSORefsFromAttributes(
        legacyAttributes,
        options?.references ?? [],
        this.context.persistableStateAttachmentTypeRegistry
      );

      const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

      const res =
        await this.context.unsecuredSavedObjectsClient.update<AttachmentPersistedAttributes>(
          CASE_COMMENT_SAVED_OBJECT,
          attachmentId,
          extractedAttributes,
          {
            ...options,
            /**
             * If options?.references are undefined and there is no field to move to the refs
             * then the extractedReferences will be an empty array. If we pass the empty array
             * on the update then all previously refs will be removed. The check below is needed
             * to prevent this.
             */
            references: shouldUpdateRefs ? extractedReferences : undefined,
          }
        );

      const transformedAttachment = injectAttachmentSOAttributesFromRefsForPatch(
        updatedAttributes,
        res,
        this.context.persistableStateAttachmentTypeRegistry
      );

      const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
        transformedAttachment.attributes
      );

      return Object.assign(transformedAttachment, { attributes: validatedAttributes });
    } catch (error) {
      this.context.log.error(`Error on UPDATE attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({
    comments,
    refresh,
    owner,
  }: BulkUpdateAttachmentArgs): Promise<SavedObjectsBulkUpdateResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(
        `Attempting to UPDATE attachments ${comments.map((c) => c.attachmentId).join(', ')}`
      );

      const savedObjectType = getAttachmentSavedObjectType(this.context.config);

      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const res =
          await this.context.unsecuredSavedObjectsClient.bulkUpdate<UnifiedAttachmentAttributes>(
            comments.map((c) => {
              const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
                c.updatedAttributes
              );
              const transformer = getAttachmentTypeTransformer(
                getAttachmentTypeFromAttributes(decodedAttributes)
              );
              const unifiedAttributes = transformer.toNewSchema(decodedAttributes);

              return {
                ...c.options,
                type: CASE_ATTACHMENT_SAVED_OBJECT,
                id: c.attachmentId,
                attributes: unifiedAttributes,
              };
            }),
            { refresh }
          );
        return this.transformAndDecodeBulkUpdateResponse(res, comments);
      }

      const res =
        await this.context.unsecuredSavedObjectsClient.bulkUpdate<AttachmentPersistedAttributes>(
          comments.map((c) => {
            const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(c.updatedAttributes);
            const transformer = getAttachmentTypeTransformer(
              getAttachmentTypeFromAttributes(decodedAttributes)
            );
            const legacyAttributes = transformer.toOldSchema(decodedAttributes, owner);
            const {
              attributes: extractedAttributes,
              references: extractedReferences,
              didDeleteOperation,
            } = extractAttachmentSORefsFromAttributes(
              legacyAttributes,
              c.options?.references ?? [],
              this.context.persistableStateAttachmentTypeRegistry
            );

            const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

            return {
              ...c.options,
              type: CASE_COMMENT_SAVED_OBJECT,
              id: c.attachmentId,
              attributes: extractedAttributes,
              /* If c.options?.references are undefined and there is no field to move to the refs
               * then the extractedAttributes will be an empty array. If we pass the empty array
               * on the update then all previously refs will be removed. The check below is needed
               * to prevent this.
               */
              references: shouldUpdateRefs ? extractedReferences : undefined,
            };
          }),
          { refresh }
        );

      return this.transformAndDecodeBulkUpdateResponse(res, comments);
    } catch (error) {
      this.context.log.error(
        `Error on UPDATE attachments ${comments.map((c) => c.attachmentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }

  private transformAndDecodeBulkUpdateResponse(
    res: SavedObjectsBulkUpdateResponse<
      AttachmentPersistedAttributes | UnifiedAttachmentAttributes
    >,
    comments: UpdateArgs[]
  ): SavedObjectsBulkUpdateResponse<AttachmentAttributesV2> {
    const validatedAttachments: Array<SavedObjectsUpdateResponse<AttachmentAttributesV2>> = [];

    for (let i = 0; i < res.saved_objects.length; i++) {
      const attachment = res.saved_objects[i];

      if (isSOError(attachment)) {
        // Forcing the type here even though it is an error. The client is responsible for
        // determining what to do with the errors
        // TODO: we should fix the return type of this function so that it can return errors
        validatedAttachments.push(attachment as SavedObjectsUpdateResponse<AttachmentAttributesV2>);
      } else if (attachment.type === CASE_ATTACHMENT_SAVED_OBJECT) {
        const validatedAttributes = decodeOrThrow(UnifiedAttachmentAttributesRt)(
          attachment.attributes
        );
        validatedAttachments.push(Object.assign(attachment, { attributes: validatedAttributes }));
      } else {
        const transformedAttachment = injectAttachmentSOAttributesFromRefsForPatch(
          comments[i].updatedAttributes,
          attachment,
          this.context.persistableStateAttachmentTypeRegistry
        );

        const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
          transformedAttachment.attributes
        );

        validatedAttachments.push(
          Object.assign(transformedAttachment, { attributes: validatedAttributes })
        );
      }
    }

    return Object.assign(res, { saved_objects: validatedAttachments });
  }

  /**
   * @deprecated Use search instead.
   */
  public async find({
    options,
  }: {
    options?: SavedObjectFindOptionsKueryNode;
  }): Promise<SavedObjectsFindResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to find comments`);
      const res =
        await this.context.unsecuredSavedObjectsClient.find<AttachmentPersistedAttributes>({
          sortField: defaultSortField,
          ...options,
          type: CASE_COMMENT_SAVED_OBJECT,
        });

      const validatedAttachments: Array<SavedObjectsFindResult<AttachmentTransformedAttributes>> =
        [];

      for (const so of res.saved_objects) {
        const transformedAttachment = injectAttachmentSOAttributesFromRefs(
          so,
          this.context.persistableStateAttachmentTypeRegistry
          // casting here because injectAttachmentSOAttributesFromRefs returns a SavedObject but we need a SavedObjectsFindResult
          // which has the score in it. The score is returned but the type is not correct
        ) as SavedObjectsFindResult<AttachmentTransformedAttributes>;

        const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
          transformedAttachment.attributes
        );

        validatedAttachments.push(
          Object.assign(transformedAttachment, {
            attributes: validatedAttributes,
          })
        );
      }

      return Object.assign(res, { saved_objects: validatedAttachments });
    } catch (error) {
      this.context.log.error(`Error on find comments: ${error}`);
      throw error;
    }
  }

  /**
   * Find attachments via search API (both cases-attachments and cases-comments).
   * Returns a find-style response for use with transformComments and authorization.
   */
  public async findViaSearch(
    options: SavedObjectFindOptionsKueryNode | undefined,
    namespaces: string[]
  ): Promise<SavedObjectsFindResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(`Attempting to find attachments via search`);
      const { page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE, ...restOptions } = options ?? {};
      const searchParams = attachmentFindOptionsToSearchParams({
        ...restOptions,
        page,
        perPage,
        sortField: restOptions.sortField ?? defaultSortField,
        sortOrder: restOptions.sortOrder ?? 'desc',
      });

      const result = await this.search({
        namespaces,
        ...searchParams,
        seq_no_primary_term: true,
      });

      const total =
        typeof result.hits.total === 'object'
          ? result.hits.total?.value ?? 0
          : result.hits.total ?? 0;

      const validatedAttachments: Array<SavedObjectsFindResult<AttachmentAttributesV2>> = [];

      const hitsToProcess = result.hits.hits.filter((hit) => {
        const raw = hit._source as Record<string, unknown> | undefined;
        return Boolean(hit._id && raw && typeof raw.type === 'string');
      });

      for (const hit of hitsToProcess) {
        const raw = (hit._source ?? {}) as Record<string, unknown>;
        const soType = raw.type as string;
        // In the raw ES document, _source[type] holds the attributes directly (see serializer rawToSavedObject)
        const attributes = (raw[soType] ?? {}) as
          | AttachmentPersistedAttributes
          | UnifiedAttachmentAttributes;
        const refs = (raw.references as Array<{ type: string; id: string; name?: string }>) ?? [];
        const references = refs.map((r) => ({ type: r.type, id: r.id, name: r.name ?? '' }));
        const version = encodeHitVersion(hit as { _seq_no?: number; _primary_term?: number });
        const id = hit._id as string;

        const so: SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes> = {
          id,
          type: soType,
          attributes,
          references,
          version: version ?? undefined,
          namespaces: (raw.namespaces as string[] | undefined) ?? [],
        };

        const transformedAttachment = injectAttachmentSOAttributesFromRefs(
          so,
          this.context.persistableStateAttachmentTypeRegistry
        ) as SavedObjectsFindResult<AttachmentAttributesV2>;

        const validatedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
          transformedAttachment.attributes
        );

        validatedAttachments.push(
          Object.assign(transformedAttachment, {
            attributes: validatedAttributes,
          })
        );
      }

      return {
        saved_objects: validatedAttachments,
        total,
        page,
        per_page: perPage,
      };
    } catch (error) {
      this.context.log.error(`Error on findViaSearch attachments: ${error}`);
      throw error;
    }
  }

  /**
   * Performs a raw search across both attachment saved object types (cases-attachments and cases-comments).
   * Use this when you need to query attachments regardless of which SO type they are stored in.
   */
  public async search({
    namespaces,
    query,
    ...options
  }: Omit<SavedObjectsSearchOptions, 'type'>): Promise<SavedObjectsSearchResponse> {
    try {
      this.context.log.debug(`Attempting to search attachments`);
      const result = await this.context.unsecuredSavedObjectsClient.search({
        type: [CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT],
        namespaces,
        query,
        seq_no_primary_term: true,
        ...options,
      });

      return result;
    } catch (error) {
      this.context.log.error(`Error on search attachments: ${error}`);
      throw error;
    }
  }
}
