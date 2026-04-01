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

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression } from '@kbn/es-query';
import { AttachmentType } from '../../../common/types/domain';
import type { AttachmentMode } from '../../../common/types/domain/attachment/v2';
import {
  UnifiedAttachmentAttributesRt,
  AttachmentAttributesRtV2,
  AttachmentPatchAttributesRtV2,
} from '../../../common/types/domain/attachment/v2';
import { decodeOrThrow } from '../../common/runtime_types';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  FILE_ATTACHMENT_TYPE,
} from '../../../common/constants';
import {
  getAttachmentSavedObjectType,
  getAttachmentTypeFromAttributes,
  getAttachmentTypeTransformers,
  resolveAttachmentSavedObjectType,
} from '../../common/attachments';
import { passThroughTransformer } from '../../common/attachments/base';

import { buildFilter, combineFilters } from '../../client/utils';
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
  AttachmentTransformedAttributesV2,
  UnifiedAttachmentAttributes,
  UnifiedAttachmentPersistedAttributes,
  UnifiedAttachmentSavedObjectTransformed,
} from '../../common/types/attachments_v2';
import { isSOError } from '../../common/error';
import { transformAttributesForMode } from './operations/utils';

/**
 * Ensures alert attachments have rule.name, or else existing tests will fail
 */
function assertAlertAttachmentHasRuleName(attributes: Record<string, unknown>): void {
  const type = attributes?.type;
  if (type !== AttachmentType.alert && type !== 'alert') {
    return;
  }
  const rule = attributes.rule as { name?: unknown } | null | undefined;
  if (rule == null || rule.name == null) {
    throw new Error('Invalid attributes: expected attributes.rule.name for alert attachments');
  }
}

export class AttachmentService {
  private readonly _getter: AttachmentGetter;

  constructor(private readonly context: ServiceContext) {
    this._getter = new AttachmentGetter(context);
  }

  public get getter() {
    return this._getter;
  }

  private async getAttachmentSavedObjectType(
    savedObjectId: string
  ): Promise<typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT | null> {
    return resolveAttachmentSavedObjectType(
      this.context.unsecuredSavedObjectsClient,
      savedObjectId
    );
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
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
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

  public async bulkDelete({ savedObjectIds, refresh }: DeleteAttachmentArgs) {
    try {
      if (savedObjectIds.length <= 0) {
        return;
      }

      this.context.log.debug(`Attempting to DELETE attachments ${savedObjectIds}`);
      // SO IDs are space-unique, so the same ID in both types refers to the same logical attachment.
      // If an attachment doesn't exist in one type, bulkDelete will ignore it.
      const deleteRequests = savedObjectIds.flatMap((id) => [
        { id, type: CASE_ATTACHMENT_SAVED_OBJECT },
        { id, type: CASE_COMMENT_SAVED_OBJECT },
      ]);
      await this.context.unsecuredSavedObjectsClient.bulkDelete(deleteRequests, {
        refresh,
      });
    } catch (error) {
      this.context.log.error(`Error on DELETE attachments ${savedObjectIds}: ${error}`);
      throw error;
    }
  }

  public async create({
    attributes,
    references,
    id,
    refresh,
  }: CreateAttachmentArgs): Promise<
    AttachmentSavedObjectTransformed | UnifiedAttachmentSavedObjectTransformed
  > {
    try {
      this.context.log.debug(`Attempting to POST a new comment`);

      const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(attributes);
      const savedObjectType = getAttachmentSavedObjectType(this.context.config);
      const transformer = getAttachmentTypeTransformers(
        getAttachmentTypeFromAttributes(decodedAttributes)
      );
      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);
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

      const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
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
  }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(`Attempting to bulk create attachments`);

      const savedObjectType = getAttachmentSavedObjectType(this.context.config);

      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const res =
          await this.context.unsecuredSavedObjectsClient.bulkCreate<UnifiedAttachmentAttributes>(
            attachments.map((attachment) => {
              const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
                attachment.attributes
              );
              const transformer = getAttachmentTypeTransformers(
                getAttachmentTypeFromAttributes(decodedAttributes)
              );
              const attributesToWrite = transformer.toUnifiedSchema(decodedAttributes);

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

            const transformer = getAttachmentTypeTransformers(
              getAttachmentTypeFromAttributes(decodedAttributes)
            );
            const attributesToWrite = transformer.toLegacySchema(decodedAttributes);
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
      } else if (so.type === CASE_COMMENT_SAVED_OBJECT) {
        const legacySo = so as SavedObject<AttachmentPersistedAttributes>;
        const transformedAttachment = injectAttachmentSOAttributesFromRefs(
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

    return Object.assign(res, { saved_objects: validatedAttachments });
  }

  public async update({
    savedObjectId,
    updatedAttributes,
    options,
  }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(`Attempting to UPDATE attachment ${savedObjectId}`);

      const soType = await this.getAttachmentSavedObjectType(savedObjectId);
      if (soType === null) {
        throw new Error(`Attachment ${savedObjectId} not found`);
      }

      const decodedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(updatedAttributes);
      assertAlertAttachmentHasRuleName(decodedAttributes as Record<string, unknown>);
      const transformer = getAttachmentTypeTransformers(
        getAttachmentTypeFromAttributes(decodedAttributes)
      );

      if (soType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);

        const res =
          await this.context.unsecuredSavedObjectsClient.update<UnifiedAttachmentAttributes>(
            CASE_ATTACHMENT_SAVED_OBJECT,
            savedObjectId,
            unifiedAttributes,
            { ...options }
          );
        return Object.assign(res, { attributes: decodedAttributes });
      }

      const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
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
          savedObjectId,
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
        legacyAttributes,
        res,
        this.context.persistableStateAttachmentTypeRegistry
      );

      assertAlertAttachmentHasRuleName(transformedAttachment.attributes as Record<string, unknown>);
      const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
        transformedAttachment.attributes
      );

      return Object.assign(transformedAttachment, { attributes: validatedAttributes });
    } catch (error) {
      this.context.log.error(`Error on UPDATE attachment ${savedObjectId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({
    comments,
    refresh,
    requestWithoutType = false,
  }: BulkUpdateAttachmentArgs): Promise<SavedObjectsBulkUpdateResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(
        `Attempting to UPDATE attachments ${comments.map((c) => c.savedObjectId).join(', ')}`
      );

      const savedObjectType = getAttachmentSavedObjectType(this.context.config);

      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const res =
          await this.context.unsecuredSavedObjectsClient.bulkUpdate<UnifiedAttachmentAttributes>(
            comments.map((c) => {
              const decodedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
                c.updatedAttributes
              );
              const transformer = requestWithoutType
                ? passThroughTransformer
                : getAttachmentTypeTransformers(getAttachmentTypeFromAttributes(decodedAttributes));
              const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);

              return {
                ...c.options,
                type: CASE_ATTACHMENT_SAVED_OBJECT,
                id: c.savedObjectId,
                attributes: unifiedAttributes,
              };
            }),
            { refresh }
          );
        return this.transformAndDecodeBulkUpdateResponse(res, comments, requestWithoutType);
      }

      const res =
        await this.context.unsecuredSavedObjectsClient.bulkUpdate<AttachmentPersistedAttributes>(
          comments.map((c) => {
            const decodedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(
              c.updatedAttributes
            );
            assertAlertAttachmentHasRuleName(decodedAttributes as Record<string, unknown>);
            const transformer = requestWithoutType
              ? passThroughTransformer
              : getAttachmentTypeTransformers(getAttachmentTypeFromAttributes(decodedAttributes));
            const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
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
              id: c.savedObjectId,
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

      return this.transformAndDecodeBulkUpdateResponse(res, comments, requestWithoutType);
    } catch (error) {
      this.context.log.error(
        `Error on UPDATE attachments ${comments.map((c) => c.savedObjectId).join(', ')}: ${error}`
      );
      throw error;
    }
  }

  private transformAndDecodeBulkUpdateResponse(
    res: SavedObjectsBulkUpdateResponse<
      AttachmentPersistedAttributes | UnifiedAttachmentPersistedAttributes
    >,
    comments: UpdateArgs[],
    requestWithoutType: boolean
  ): SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributesV2> {
    const validatedAttachments: Array<
      SavedObjectsUpdateResponse<AttachmentTransformedAttributesV2>
    > = [];

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
        const decodedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(
          comments[i].updatedAttributes
        );
        const transformer = requestWithoutType
          ? passThroughTransformer
          : getAttachmentTypeTransformers(getAttachmentTypeFromAttributes(decodedAttributes));
        const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
        const transformedAttachment = injectAttachmentSOAttributesFromRefsForPatch(
          legacyAttributes,
          attachment,
          this.context.persistableStateAttachmentTypeRegistry
        );

        assertAlertAttachmentHasRuleName(
          transformedAttachment.attributes as Record<string, unknown>
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

  public async find({
    options,
    mode,
  }: {
    options?: SavedObjectFindOptionsKueryNode;
    mode: AttachmentMode;
  }): Promise<SavedObjectsFindResponse<AttachmentAttributesV2>> {
    try {
      this.context.log.debug(`Attempting to find comments`);

      const isCasesAttachmentsEnabled = this.context.config.attachments?.enabled === true;
      const res = await this.context.unsecuredSavedObjectsClient.find<AttachmentAttributesV2>({
        sortField: defaultSortField,
        ...options,
        type: isCasesAttachmentsEnabled
          ? [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT]
          : CASE_COMMENT_SAVED_OBJECT,
      });

      const validatedAttachments: Array<SavedObjectsFindResult<AttachmentAttributesV2>> = [];

      for (const so of res.saved_objects) {
        const transformed = transformAttributesForMode({
          attributes: so.attributes,
          mode,
        });
        if (transformed.isUnified) {
          validatedAttachments.push(Object.assign(so, { attributes: transformed.attributes }));
        } else {
          const transformedAttachment = injectAttachmentSOAttributesFromRefs(
            { ...so, attributes: transformed.attributes },
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
      }

      return Object.assign(res, { saved_objects: validatedAttachments });
    } catch (error) {
      this.context.log.error(`Error on find comments: ${error}`);
      throw error;
    }
  }
}
