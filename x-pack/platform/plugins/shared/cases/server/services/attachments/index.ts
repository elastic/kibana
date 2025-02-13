/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression } from '@kbn/es-query';
import { AttachmentAttributesRt, AttachmentType } from '../../../common/types/domain';
import { decodeOrThrow } from '../../common/runtime_types';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  FILE_ATTACHMENT_TYPE,
} from '../../../common/constants';
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
} from '../../common/types/attachments';
import {
  AttachmentTransformedAttributesRt,
  AttachmentPartialAttributesRt,
} from '../../common/types/attachments';
import { isSOError } from '../../common/error';

export class AttachmentService {
  private readonly _getter: AttachmentGetter;

  constructor(private readonly context: ServiceContext) {
    this._getter = new AttachmentGetter(context);
  }

  public get getter() {
    return this._getter;
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
      await this.context.unsecuredSavedObjectsClient.bulkDelete(
        attachmentIds.map((id) => ({ id, type: CASE_COMMENT_SAVED_OBJECT })),
        {
          refresh,
        }
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
  }: CreateAttachmentArgs): Promise<AttachmentSavedObjectTransformed> {
    try {
      this.context.log.debug(`Attempting to POST a new comment`);

      const decodedAttributes = decodeOrThrow(AttachmentAttributesRt)(attributes);

      const { attributes: extractedAttributes, references: extractedReferences } =
        extractAttachmentSORefsFromAttributes(
          decodedAttributes,
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
  }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to bulk create attachments`);
      const res =
        await this.context.unsecuredSavedObjectsClient.bulkCreate<AttachmentPersistedAttributes>(
          attachments.map((attachment) => {
            const decodedAttributes = decodeOrThrow(AttachmentAttributesRt)(attachment.attributes);

            const { attributes: extractedAttributes, references: extractedReferences } =
              extractAttachmentSORefsFromAttributes(
                decodedAttributes,
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
    res: SavedObjectsBulkResponse<AttachmentPersistedAttributes>
  ): SavedObjectsBulkResponse<AttachmentTransformedAttributes> {
    const validatedAttachments: AttachmentSavedObjectTransformed[] = [];

    for (const so of res.saved_objects) {
      if (isSOError(so)) {
        validatedAttachments.push(so as AttachmentSavedObjectTransformed);
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
  }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to UPDATE comment ${attachmentId}`);

      const decodedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(updatedAttributes);

      const {
        attributes: extractedAttributes,
        references: extractedReferences,
        didDeleteOperation,
      } = extractAttachmentSORefsFromAttributes(
        decodedAttributes,
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
      this.context.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({
    comments,
    refresh,
  }: BulkUpdateAttachmentArgs): Promise<
    SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributes>
  > {
    try {
      this.context.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );

      const res =
        await this.context.unsecuredSavedObjectsClient.bulkUpdate<AttachmentPersistedAttributes>(
          comments.map((c) => {
            const decodedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
              c.updatedAttributes
            );

            const {
              attributes: extractedAttributes,
              references: extractedReferences,
              didDeleteOperation,
            } = extractAttachmentSORefsFromAttributes(
              decodedAttributes,
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
        `Error on UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }

  private transformAndDecodeBulkUpdateResponse(
    res: SavedObjectsBulkUpdateResponse<AttachmentPersistedAttributes>,
    comments: UpdateArgs[]
  ): SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributes> {
    const validatedAttachments: Array<SavedObjectsUpdateResponse<AttachmentTransformedAttributes>> =
      [];

    for (let i = 0; i < res.saved_objects.length; i++) {
      const attachment = res.saved_objects[i];

      if (isSOError(attachment)) {
        // Forcing the type here even though it is an error. The client is responsible for
        // determining what to do with the errors
        // TODO: we should fix the return type of this function so that it can return errors
        validatedAttachments.push(attachment as AttachmentSavedObjectTransformed);
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
}
