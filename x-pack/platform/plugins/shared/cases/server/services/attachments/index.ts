/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  SavedObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import type { estypes } from '@elastic/elasticsearch';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import { AttachmentType } from '../../../common/types/domain';
import {
  UNIFIED_ALERT_TYPES_ARRAY,
  isAlertAttachmentType,
} from '../../../common/utils/attachments';
import type { AttachmentMode } from '../../../common/types/domain/attachment/v2';
import {
  AttachmentAttributesRtV2,
  AttachmentPatchAttributesRtV2,
} from '../../../common/types/domain/attachment/v2';
import { decodeOrThrow } from '../../common/runtime_types';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  LEGACY_FILE_ATTACHMENT_TYPE,
} from '../../../common/constants';
import {
  PERSISTABLE_ATTACHMENT_TYPES,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import {
  getAttachmentSavedObjectType,
  getAttachmentTypeFromAttributes,
  getAttachmentTypeTransformers,
  resolveAttachmentSavedObjectTypes,
} from '../../common/attachments';
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
  CreateAttachmentArgs,
  DeleteAttachmentArgs,
  ServiceContext,
  UpdateAttachmentArgs,
  UpdateArgs,
} from './types';
import { AttachmentGetter } from './operations/get';
import type {
  AttachmentPersistedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../common/types/attachments_v1';
import {
  AttachmentTransformedAttributesRt,
  AttachmentPartialAttributesRt,
} from '../../common/types/attachments_v1';
import type {
  AttachmentAttributesV2,
  AttachmentSavedObjectTransformedV2,
  AttachmentTransformedAttributesV2,
  UnifiedAttachmentAttributes,
  UnifiedAttachmentPersistedAttributes,
  UnifiedAttachmentSavedObjectTransformed,
} from '../../common/types/attachments_v2';
import { isSOError } from '../../common/error';
import {
  assertLegacyWriteableAttachmentType,
  getTransformerForPatchAttributes,
  transformAttributesForMode,
} from './operations/utils';

const PERSISTABLE_ATTACHMENT_TYPES_ARRAY = Array.from(PERSISTABLE_ATTACHMENT_TYPES);

/**
 * Ensures alert attachments include a rule name
 */
function assertAlertAttachmentHasRuleName(attributes: Record<string, unknown>): void {
  const type = attributes?.type;
  if (!isAlertAttachmentType(type as string)) {
    return;
  }

  if (type === AttachmentType.alert || type === 'alert') {
    const rule = attributes.rule as { name?: unknown } | null | undefined;
    if (rule == null || rule.name == null) {
      throw Boom.badRequest(
        'Invalid attributes: expected attributes.rule.name for alert attachments'
      );
    }
    return;
  }

  const metadata = attributes.metadata as { rule?: { name?: unknown } } | null | undefined;
  const rule = metadata?.rule;
  if (rule == null || rule.name == null) {
    throw Boom.badRequest(
      'Invalid attributes: expected attributes.metadata.rule.name for unified alert attachments'
    );
  }
}

/**
 * Unified attachment shape fields that must NOT appear on the legacy
 * `cases-comments` SO. When a unified-shape payload (e.g.
 * `{ type: 'security.endpoint', attachmentId, metadata }`) is written to the
 * legacy SO type, the request attributes still carry those keys after io-ts
 * decoding and may otherwise leak into `_source` (mapping is `dynamic: false`,
 * so they would be stored but not indexed). Stripping here guarantees
 * byte-for-byte equivalence with pre-migration legacy writes.
 *
 * Applied via {@link stripUnifiedOnlyFields} on every legacy-SO write path:
 * `create`, `bulkCreate`, `update`, `bulkUpdate`. Regression tests for all
 * four paths live in the "byte-for-byte legacy storage equivalence" describe
 * block in `index.test.ts`.
 */
const UNIFIED_ONLY_ATTRIBUTE_KEYS = ['attachmentId', 'metadata', 'data'] as const;

function stripUnifiedOnlyFields<T extends object>(attributes: T): T {
  const asRecord = attributes as unknown as Record<string, unknown>;
  let result: Record<string, unknown> | undefined;
  for (const key of UNIFIED_ONLY_ATTRIBUTE_KEYS) {
    if (key in asRecord) {
      if (result === undefined) {
        result = { ...asRecord };
      }
      delete result[key];
    }
  }
  return (result ?? asRecord) as unknown as T;
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
   * Counts the unique number of alerts (deduplicated by id) attached to a case
   * across legacy and unified alert attachments. Honors an optional
   * authorization filter so the metric reflects what the caller can see.
   *
   * Used by the case metrics handler to display the alert count to the user.
   */
  public async countAlertsAttachedToCase(
    params: AlertsAttachedToCaseArgs
  ): Promise<number | undefined> {
    const { caseId, filter: authorizationFilter } = params;
    try {
      this.context.log.debug(`Attempting to count alerts for case id ${caseId}`);
      return this.aggregateAlertsForCase({
        caseId,
        aggType: 'cardinality',
        extraFilter: authorizationFilter,
      });
    } catch (error) {
      this.context.log.error(`Error while counting alerts for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Counts the total number of alert occurrences attached to a case across both
   * legacy and unified alert attachments. Uses value_count (not cardinality)
   * so each alert occurrence is counted, mirroring how
   * AlertLimiter.countOfItemsInRequest sums `ids.length` per request.
   */
  public async countAlertsWithinCase(caseId: string): Promise<number> {
    try {
      this.context.log.debug(
        `Attempting to count all alerts (legacy + unified) for case ${caseId}`
      );
      return this.aggregateAlertsForCase({ caseId, aggType: 'value_count' });
    } catch (error) {
      this.context.log.error(`Error while counting alerts for case ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Shared aggregation across legacy (`cases-comments.attributes.alertId`) and
   * unified (`cases-attachments.attributes.attachmentId`) alert storage.
   *
   * @param aggType `'cardinality'` for unique alert ids, `'value_count'` for occurrences.
   * @param extraFilter additional KueryNode (e.g. authorization) AND-combined onto the type filter.
   */
  private async aggregateAlertsForCase({
    caseId,
    aggType,
    extraFilter,
  }: {
    caseId: string;
    aggType: 'cardinality' | 'value_count';
    extraFilter?: KueryNode;
  }): Promise<number> {
    const typeFilters: Array<KueryNode | undefined> = [
      buildFilter({
        filters: [AttachmentType.alert],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
      buildFilter({
        filters: UNIFIED_ALERT_TYPES_ARRAY,
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      }),
    ];

    const aggregations: Record<string, estypes.AggregationsAggregationContainer> = {
      legacyAlerts: {
        [aggType]: { field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId` },
      },
      unifiedAlerts: {
        [aggType]: { field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.attachmentId` },
      },
    };

    const combinedTypeFilter = combineFilters(typeFilters, 'or');
    const combinedFilter = combineFilters([combinedTypeFilter, extraFilter]);

    const response = await this.context.unsecuredSavedObjectsClient.find<
      unknown,
      { legacyAlerts: { value: number }; unifiedAlerts: { value: number } }
    >({
      type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
      hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
      page: 1,
      perPage: 1,
      sortField: defaultSortField,
      aggs: aggregations,
      filter: combinedFilter,
    });

    const legacyCount = response.aggregations?.legacyAlerts?.value ?? 0;
    const unifiedCount = response.aggregations?.unifiedAlerts?.value ?? 0;

    return legacyCount + unifiedCount;
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
   * Counts attachments that contribute to the
   * `MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES` limit:
   * - Legacy: `persistableState` and `externalReference` rows in
   *   `cases-comments`, EXCLUDING `.files` (file attachments are limited
   *   separately).
   * - Unified (when the flag is on): persistable-state subtypes plus
   *   `security.endpoint`, EXCLUDING `file` (matched via the `type` field on
   *   `cases-attachments`).
   *
   * Files are intentionally excluded on both sides; the request-side
   * `PersistableStateAndExternalReferencesLimiter.countOfItemsInRequest`
   * filters them out symmetrically.
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

      const legacyTypeFilter = buildFilter({
        filters: [AttachmentType.persistableState, AttachmentType.externalReference],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const excludeLegacyFilesFilter = fromKueryExpression(
        `not ${CASE_COMMENT_SAVED_OBJECT}.attributes.externalReferenceAttachmentTypeId: ${LEGACY_FILE_ATTACHMENT_TYPE}`
      );

      const legacyFilter = combineFilters([legacyTypeFilter, excludeLegacyFilesFilter]);

      const legacyFindPromise = this.context.unsecuredSavedObjectsClient.find<{
        total: number;
      }>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        filter: legacyFilter,
      });

      const unifiedTypesToCount = [
        ...PERSISTABLE_ATTACHMENT_TYPES_ARRAY,
        SECURITY_ENDPOINT_ATTACHMENT_TYPE,
        // Custom externalReference/persistableState subtypes with no unified
        // mapping (e.g. FTR `.test` types) are still written to
        // `cases-attachments` but keep their legacy `type`, so count those too.
        AttachmentType.persistableState,
        AttachmentType.externalReference,
      ];
      // Files are stored with the migrated unified `file` type (not the legacy
      // `.files` externalReference subtype), so excluding `file` from the type
      // list is enough — no subtype filter needed. `externalReferenceAttachmentTypeId`
      // isn't mapped on `cases-attachments`, so filtering on it would 400.
      const unifiedFilter = buildFilter({
        filters: unifiedTypesToCount,
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      });

      const unifiedFindPromise = this.context.unsecuredSavedObjectsClient.find<{
        total: number;
      }>({
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        filter: unifiedFilter,
      });

      const [legacyResponse, unifiedResponse] = await Promise.all([
        legacyFindPromise,
        unifiedFindPromise,
      ]);

      return legacyResponse.total + unifiedResponse.total;
    } catch (error) {
      this.context.log.error(
        `Error while attempting to count persistableState and externalReference attachments for case id ${caseId}: ${error}`
      );
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
      const { statuses } = await this.context.unsecuredSavedObjectsClient.bulkDelete(
        deleteRequests,
        {
          refresh,
        }
      );

      // analyticsV2 mirror to `.cases-attachments`. Fire-and-forget; the SO
      // delete is the source of truth. One bulk-delete by id covers both
      // source types (id is unique across them).
      //
      // Each id issues two delete requests (unified + legacy), but a real
      // attachment exists as only ONE of them, so the other request always
      // comes back `success: false` with a 404 (`not_found`) — core
      // `bulkDelete` reports partial failure via `statuses[]` rather than
      // throwing. A 404 means the SO is already gone, which is exactly the
      // post-state we want, so it must NOT block the mirror. Only a NON-404
      // failure means the SO may have survived; dropping its analytics doc
      // then would be unrecoverable — its `updated_at` didn't change, so
      // reconciliation never re-emits it (permanent undercount until
      // `/reset`). So exclude an id only when a delete failed with a status
      // other than 404.
      const failedIds = new Set<string>();
      for (const status of statuses) {
        if (!status.success && status.error?.statusCode !== 404) {
          failedIds.add(status.id);
        }
      }
      const idsToMirror = savedObjectIds.filter((id) => !failedIds.has(id));
      this.mirrorSafely(() =>
        this.context.analyticsV2AttachmentsWriter.bulkDeleteAttachments(idsToMirror)
      );
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
        getAttachmentTypeFromAttributes(decodedAttributes),
        decodedAttributes.owner
      );
      if (savedObjectType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);
        const { attributes: extractedAttributes, references: extractedReferences } =
          extractAttachmentSORefsFromAttributes(unifiedAttributes, references ?? []);
        const unifiedAttachment =
          await this.context.unsecuredSavedObjectsClient.create<UnifiedAttachmentAttributes>(
            CASE_ATTACHMENT_SAVED_OBJECT,
            extractedAttributes as UnifiedAttachmentAttributes,
            {
              references: extractedReferences,
              id,
              refresh,
            }
          );
        // Restore `attachmentId` on the response so callers see the shape they wrote.
        const injectedAttachment = injectAttachmentSOAttributesFromRefs(
          unifiedAttachment as unknown as SavedObject<AttachmentPersistedAttributes>
        );
        // v2 union accepts both unified- and legacy-shape attributes (some
        // unmigrated types still pass through legacy-shaped).
        const validatedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
          injectedAttachment.attributes
        );
        // analyticsV2 mirror to `.cases-attachments`. Fire-and-forget and
        // guarded (`mirrorSafely`) so it can't fail the create that already
        // persisted the SO; reconciliation backstops any failure.
        this.mirrorSafely(() =>
          this.context.analyticsV2AttachmentsWriter.upsertAttachment(
            unifiedAttachment as unknown as SavedObject<UnifiedAttachmentAttributes>
          )
        );
        return Object.assign(injectedAttachment, {
          attributes: validatedAttributes,
        }) as unknown as UnifiedAttachmentSavedObjectTransformed;
      }

      assertLegacyWriteableAttachmentType(decodedAttributes);

      const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
      const { attributes: extractedAttributes, references: extractedReferences } =
        extractAttachmentSORefsFromAttributes(legacyAttributes, references);

      const attachment =
        await this.context.unsecuredSavedObjectsClient.create<AttachmentPersistedAttributes>(
          CASE_COMMENT_SAVED_OBJECT,
          stripUnifiedOnlyFields(extractedAttributes),
          {
            references: extractedReferences,
            id,
            refresh,
          }
        );

      const transformedAttachment = injectAttachmentSOAttributesFromRefs(attachment);

      const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
        transformedAttachment.attributes
      );

      // analyticsV2 mirror — same writer for both source types; see the
      // unified branch above.
      this.mirrorSafely(() =>
        this.context.analyticsV2AttachmentsWriter.upsertAttachment(attachment)
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
                getAttachmentTypeFromAttributes(decodedAttributes),
                decodedAttributes.owner
              );
              const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);
              // Mirror the unified create path: lift `attachmentId` into refs
              // for savedObject-backed unified subtypes (those with `metadata.soType`).
              const { attributes: extractedAttributes, references: extractedReferences } =
                extractAttachmentSORefsFromAttributes(
                  unifiedAttributes,
                  attachment.references ?? []
                );

              return {
                type: CASE_ATTACHMENT_SAVED_OBJECT,
                ...attachment,
                attributes: extractedAttributes as UnifiedAttachmentAttributes,
                references: extractedReferences,
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

            assertLegacyWriteableAttachmentType(decodedAttributes);
            const transformer = getAttachmentTypeTransformers(
              getAttachmentTypeFromAttributes(decodedAttributes),
              decodedAttributes.owner
            );
            const attributesToWrite = transformer.toLegacySchema(decodedAttributes);
            const { attributes: extractedAttributes, references: extractedReferences } =
              extractAttachmentSORefsFromAttributes(attributesToWrite, attachment.references);

            return {
              type: CASE_COMMENT_SAVED_OBJECT,
              ...attachment,
              attributes: stripUnifiedOnlyFields(extractedAttributes),
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
      | AttachmentSavedObjectTransformed
      | UnifiedAttachmentSavedObjectTransformed
      | AttachmentSavedObjectTransformedV2
    > = [];
    // Only successes get mirrored — a per-entry error means there's no SO.
    const successesToMirror: Array<
      SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
    > = [];

    for (const so of res.saved_objects) {
      if (isSOError(so)) {
        validatedAttachments.push(so as AttachmentSavedObjectTransformed);
      } else if (so.type === CASE_ATTACHMENT_SAVED_OBJECT) {
        successesToMirror.push(so);
        // Restore `attachmentId` for savedObject-backed unified rows; no-op
        // for other unified types.
        const injectedAttachment = injectAttachmentSOAttributesFromRefs(
          so as unknown as SavedObject<AttachmentPersistedAttributes>
        );
        // v2 union accepts both unified- and legacy-shape attributes.
        const validatedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
          injectedAttachment.attributes
        );
        validatedAttachments.push(
          Object.assign(injectedAttachment, { attributes: validatedAttributes }) as
            | AttachmentSavedObjectTransformed
            | UnifiedAttachmentSavedObjectTransformed
        );
      } else if (so.type === CASE_COMMENT_SAVED_OBJECT) {
        successesToMirror.push(so);
        const legacySo = so as SavedObject<AttachmentPersistedAttributes>;
        const transformedAttachment = injectAttachmentSOAttributesFromRefs(legacySo);

        const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
          transformedAttachment.attributes
        );

        validatedAttachments.push(
          Object.assign(transformedAttachment, { attributes: validatedAttributes })
        );
      }
    }

    // analyticsV2 mirror to `.cases-attachments` — one guarded, fire-and-
    // forget bulk request for the successes; reconciliation backstops the rest.
    if (successesToMirror.length > 0) {
      this.mirrorSafely(() =>
        this.context.analyticsV2AttachmentsWriter.bulkUpsertAttachments(successesToMirror)
      );
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

      const [soType] = await resolveAttachmentSavedObjectTypes(
        this.context.unsecuredSavedObjectsClient,
        [savedObjectId]
      );
      if (soType === null) {
        throw new Error(`Attachment ${savedObjectId} not found`);
      }

      const decodedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(updatedAttributes);
      assertAlertAttachmentHasRuleName(decodedAttributes as Record<string, unknown>);
      const transformer = getAttachmentTypeTransformers(
        getAttachmentTypeFromAttributes(decodedAttributes),
        decodedAttributes.owner ?? ''
      );

      if (soType === CASE_ATTACHMENT_SAVED_OBJECT) {
        const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);

        // Mirror `attachmentId` into references for SO-backed unified attachments
        // (e.g. files) so a patch doesn't drop the dependency and blank out
        // `attachmentId` on the next read. Matches the unified `create` path.
        const {
          attributes: extractedAttributes,
          references: extractedReferences,
          didDeleteOperation,
        } = extractAttachmentSORefsFromAttributes(unifiedAttributes, options?.references ?? []);

        // Same guard as the legacy branch: only overwrite references when we
        // actually have some, otherwise a partial patch would wipe the existing
        // (e.g. case) references.
        const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

        const res =
          await this.context.unsecuredSavedObjectsClient.update<UnifiedAttachmentAttributes>(
            CASE_ATTACHMENT_SAVED_OBJECT,
            savedObjectId,
            extractedAttributes as UnifiedAttachmentAttributes,
            { ...options, references: shouldUpdateRefs ? extractedReferences : undefined }
          );
        // analyticsV2 mirror via a full re-read — see `mirrorUpdatedAttachments`.
        // Mirroring the partial `update` response directly would drop the
        // immutable creation fields (`created_at` → `@timestamp`) and flicker
        // the edited attachment off time-filtered views until reconciliation.
        this.mirrorUpdatedAttachments([{ type: CASE_ATTACHMENT_SAVED_OBJECT, id: savedObjectId }]);
        return Object.assign(res, { attributes: decodedAttributes });
      }

      assertLegacyWriteableAttachmentType(decodedAttributes);

      const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
      const {
        attributes: extractedAttributes,
        references: extractedReferences,
        didDeleteOperation,
      } = extractAttachmentSORefsFromAttributes(legacyAttributes, options?.references ?? []);

      const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

      const res =
        await this.context.unsecuredSavedObjectsClient.update<AttachmentPersistedAttributes>(
          CASE_COMMENT_SAVED_OBJECT,
          savedObjectId,
          stripUnifiedOnlyFields(extractedAttributes),
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
        res
      );

      assertAlertAttachmentHasRuleName(transformedAttachment.attributes as Record<string, unknown>);
      const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
        transformedAttachment.attributes
      );

      // analyticsV2 mirror via a full re-read — same reason as the unified
      // branch above (`mirrorUpdatedAttachments`).
      this.mirrorUpdatedAttachments([{ type: CASE_COMMENT_SAVED_OBJECT, id: savedObjectId }]);

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
  }: BulkUpdateAttachmentArgs): Promise<
    SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributesV2>
  > {
    try {
      this.context.log.debug(
        `Attempting to UPDATE attachments ${comments.map((c) => c.savedObjectId).join(', ')}`
      );

      // Resolve every attachment's SO type in a single bulkGet round trip.
      // Unknown ids (404 in both types) fall back to the FF-derived default
      // write target so the subsequent bulkUpdate surfaces a typed not-found
      // error from the bucket that matches current write routing.
      const defaultSavedObjectType = getAttachmentSavedObjectType(this.context.config);
      const perAttachmentTypes = (
        await resolveAttachmentSavedObjectTypes(
          this.context.unsecuredSavedObjectsClient,
          comments.map((c) => c.savedObjectId)
        )
      ).map((soType) => soType ?? defaultSavedObjectType);

      const unifiedRequests: Array<{
        index: number;
        payload: SavedObjectsBulkUpdateObject<UnifiedAttachmentAttributes>;
      }> = [];
      const legacyRequests: Array<{
        index: number;
        payload: SavedObjectsBulkUpdateObject<AttachmentPersistedAttributes>;
      }> = [];

      for (let i = 0; i < comments.length; i++) {
        const c = comments[i];
        const decodedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(c.updatedAttributes);
        const transformer = getTransformerForPatchAttributes(decodedAttributes, requestWithoutType);

        if (perAttachmentTypes[i] === CASE_ATTACHMENT_SAVED_OBJECT) {
          const unifiedAttributes = transformer.toUnifiedSchema(decodedAttributes);
          unifiedRequests.push({
            index: i,
            payload: {
              ...c.options,
              type: CASE_ATTACHMENT_SAVED_OBJECT,
              id: c.savedObjectId,
              attributes: unifiedAttributes,
            },
          });
        } else {
          assertAlertAttachmentHasRuleName(decodedAttributes as Record<string, unknown>);
          // Skip when `requestWithoutType` is set: the patch carries no `type`
          // to resolve, and only the typed path can introduce a unified-only type.
          if (!requestWithoutType) {
            assertLegacyWriteableAttachmentType(decodedAttributes);
          }
          const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
          const {
            attributes: extractedAttributes,
            references: extractedReferences,
            didDeleteOperation,
          } = extractAttachmentSORefsFromAttributes(legacyAttributes, c.options?.references ?? []);

          const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

          legacyRequests.push({
            index: i,
            payload: {
              ...c.options,
              type: CASE_COMMENT_SAVED_OBJECT,
              id: c.savedObjectId,
              attributes: stripUnifiedOnlyFields(extractedAttributes),
              /* If c.options?.references are undefined and there is no field to move to the refs
               * then the extractedAttributes will be an empty array. If we pass the empty array
               * on the update then all previously refs will be removed. The check below is needed
               * to prevent this.
               */
              references: shouldUpdateRefs ? extractedReferences : undefined,
            },
          });
        }
      }

      const mergedSavedObjects: Array<
        SavedObjectsUpdateResponse<
          AttachmentPersistedAttributes | UnifiedAttachmentPersistedAttributes
        >
      > = new Array(comments.length);

      // Issue the two bulkUpdate calls in parallel for the mixed-bucket path.
      // Skipped buckets resolve to an empty response so the merge logic stays
      // uniform.
      const emptyBulkUpdateResponse = <T>(): SavedObjectsBulkUpdateResponse<T> => ({
        saved_objects: [],
      });
      const [unifiedRes, legacyRes] = await Promise.all([
        unifiedRequests.length > 0
          ? this.context.unsecuredSavedObjectsClient.bulkUpdate<UnifiedAttachmentAttributes>(
              unifiedRequests.map((r) => r.payload),
              { refresh }
            )
          : Promise.resolve(emptyBulkUpdateResponse<UnifiedAttachmentAttributes>()),
        legacyRequests.length > 0
          ? this.context.unsecuredSavedObjectsClient.bulkUpdate<AttachmentPersistedAttributes>(
              legacyRequests.map((r) => r.payload),
              { refresh }
            )
          : Promise.resolve(emptyBulkUpdateResponse<AttachmentPersistedAttributes>()),
      ]);

      const assignBucketResults = <T>(
        label: string,
        bucketRequests: Array<{ index: number; payload: SavedObjectsBulkUpdateObject<T> }>,
        bucketRes: SavedObjectsBulkUpdateResponse<T>
      ) => {
        if (bucketRes.saved_objects.length !== bucketRequests.length) {
          throw new Error(
            `bulkUpdate SO client contract violation: expected ${bucketRequests.length} ${label} rows, received ${bucketRes.saved_objects.length}.`
          );
        }
        // Validate each returned row matches the requested `{id, type}` rather
        // than relying purely on index ordering.
        bucketRes.saved_objects.forEach((so, k) => {
          const req = bucketRequests[k];
          if (so.id !== req.payload.id || so.type !== req.payload.type) {
            throw new Error(
              `bulkUpdate SO client contract violation: expected ${label} row {id:${req.payload.id},type:${req.payload.type}}, received {id:${so.id},type:${so.type}}.`
            );
          }
          mergedSavedObjects[req.index] = so;
        });
      };

      assignBucketResults('unified', unifiedRequests, unifiedRes);
      assignBucketResults('legacy', legacyRequests, legacyRes);

      // Every comment must end up assigned to exactly one bucket. A hole
      // indicates a routing/bookkeeping bug.
      const missingIndex = mergedSavedObjects.findIndex((so) => so == null);
      if (missingIndex !== -1) {
        throw new Error(
          `bulkUpdate internal invariant violated: unassigned slot at index ${missingIndex} for id="${comments[missingIndex].savedObjectId}".`
        );
      }

      return this.transformAndDecodeBulkUpdateResponse(
        { saved_objects: mergedSavedObjects },
        comments,
        requestWithoutType
      );
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
    // Collect the `{type, id}` of each successful entry so analytics can
    // mirror via a full re-read. SO bulkUpdate returns a per-entry partial
    // response (only the patched fields), so mirroring it directly would
    // drop the immutable creation fields — same degradation as the single
    // `update` paths. `mirrorUpdatedAttachments` re-reads the persisted
    // SOs so the analytics docs carry `@timestamp` / `created_*`.
    const successRefsToMirror: Array<{ type: string; id: string }> = [];

    for (let i = 0; i < res.saved_objects.length; i++) {
      const attachment = res.saved_objects[i];

      if (isSOError(attachment)) {
        // Forcing the type here even though it is an error. The client is responsible for
        // determining what to do with the errors
        // TODO: we should fix the return type of this function so that it can return errors
        validatedAttachments.push(attachment as SavedObjectsUpdateResponse<AttachmentAttributesV2>);
      } else if (attachment.type === CASE_ATTACHMENT_SAVED_OBJECT) {
        // Saved Objects bulkUpdate may return only the attributes that were sent in the request, not
        // the full merged document. Match single update(): return the validated patch from the request.
        const validatedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(
          comments[i].updatedAttributes
        );
        successRefsToMirror.push({ type: attachment.type, id: attachment.id });
        validatedAttachments.push(Object.assign(attachment, { attributes: validatedAttributes }));
      } else {
        const decodedAttributes = decodeOrThrow(AttachmentPatchAttributesRtV2)(
          comments[i].updatedAttributes
        );
        const transformer = getTransformerForPatchAttributes(decodedAttributes, requestWithoutType);
        const legacyAttributes = transformer.toLegacySchema(decodedAttributes);
        const transformedAttachment = injectAttachmentSOAttributesFromRefsForPatch(
          legacyAttributes,
          attachment
        );

        assertAlertAttachmentHasRuleName(
          transformedAttachment.attributes as Record<string, unknown>
        );
        const validatedAttributes = decodeOrThrow(AttachmentPartialAttributesRt)(
          transformedAttachment.attributes
        );

        successRefsToMirror.push({ type: attachment.type, id: attachment.id });
        validatedAttachments.push(
          Object.assign(transformedAttachment, { attributes: validatedAttributes })
        );
      }
    }

    // analyticsV2 mirror — single re-read + bulk upsert regardless of how
    // many entries succeeded. See `mirrorUpdatedAttachments`.
    this.mirrorUpdatedAttachments(successRefsToMirror);

    return Object.assign(res, { saved_objects: validatedAttachments });
  }

  /**
   * Dispatch a best-effort analytics mirror so a throwing writer can NEVER
   * fail the primary create / bulkCreate / delete that already persisted the
   * SO. The throw is swallowed with a WARN; reconciliation re-emits next tick.
   * (The update path guards itself via `mirrorUpdatedAttachments`' `.catch()`.)
   */
  private mirrorSafely(dispatch: () => void): void {
    try {
      dispatch();
    } catch (error) {
      this.context.log.warn(
        `cases-analyticsV2: attachments mirror dispatch threw (non-fatal, reconciliation will repair): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Mirror updated attachment SOs to the `.cases-attachments` analytics
   * index by re-reading their full persisted shape.
   *
   * WHY re-read instead of mirroring the update response: the SO
   * `update` / `bulkUpdate` response is a partial patch — it carries
   * only the fields the caller changed. Mirroring it directly writes an
   * analytics doc missing the immutable creation fields, most importantly
   * `created_at` (which the doc-builder maps to `@timestamp`) and
   * `created_by`. A doc without `@timestamp` silently drops out of every
   * time-filtered Discover / Lens view, so an edited attachment would
   * flicker off the timeline until the next reconciliation tick repaired
   * it. Re-reading gives the mirror the same full SO shape the create
   * path already has.
   *
   * Fire-and-forget: the re-read runs off the user-facing update path
   * (never awaited) so analytics never adds latency to — or fails — the
   * attachment edit. A failed re-read (or a stale read under
   * `refresh: false`) is backstopped by reconciliation, which re-emits
   * the full shape every tick, so we log at WARN and move on. Errors are
   * swallowed here rather than in the writer because the read, not the
   * write, is what can throw.
   */
  private mirrorUpdatedAttachments(refs: Array<{ type: string; id: string }>): void {
    if (refs.length === 0) {
      return;
    }

    void this.context.unsecuredSavedObjectsClient
      .bulkGet<UnifiedAttachmentAttributes | AttachmentPersistedAttributes>(refs)
      .then(({ saved_objects: savedObjects }) => {
        const sos = savedObjects.filter(
          (so): so is SavedObject<UnifiedAttachmentAttributes | AttachmentPersistedAttributes> =>
            !isSOError(so)
        );
        if (sos.length === 1) {
          this.context.analyticsV2AttachmentsWriter.upsertAttachment(sos[0]);
        } else if (sos.length > 1) {
          this.context.analyticsV2AttachmentsWriter.bulkUpsertAttachments(sos);
        }
      })
      .catch((error) => {
        this.context.log.warn(
          `cases-analyticsV2: attachments update-mirror re-read failed [ids=${refs
            .map((ref) => ref.id)
            .join(',')}]: ${
            error?.message ?? error
          }. Reconciliation will re-emit the full shape on the next tick.`
        );
      });
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

      const res = await this.context.unsecuredSavedObjectsClient.find<AttachmentAttributesV2>({
        sortField: defaultSortField,
        ...options,
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
      });

      const validatedAttachments: Array<SavedObjectsFindResult<AttachmentAttributesV2>> = [];

      for (const so of res.saved_objects) {
        const injectedSo = injectAttachmentSOAttributesFromRefs(
          so as unknown as SavedObject<AttachmentPersistedAttributes>
        ) as unknown as SavedObjectsFindResult<AttachmentAttributesV2>;
        const transformed = transformAttributesForMode({
          attributes: injectedSo.attributes,
          mode,
        });
        if (transformed.isUnified) {
          const validatedAttributes = decodeOrThrow(AttachmentAttributesRtV2)(
            transformed.attributes
          );
          validatedAttachments.push(Object.assign(injectedSo, { attributes: validatedAttributes }));
        } else {
          const validatedAttributes = decodeOrThrow(AttachmentTransformedAttributesRt)(
            transformed.attributes
          );

          validatedAttachments.push(
            Object.assign(injectedSo, {
              attributes: validatedAttributes,
            }) as unknown as SavedObjectsFindResult<AttachmentAttributesV2>
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
