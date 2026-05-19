import type { SavedObjectsBulkResponse, SavedObjectsBulkUpdateResponse, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { AttachmentMode } from '../../../common/types/domain/attachment/v2';
import type { AggregationResponse } from '../../client/metrics/types';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type { AlertsAttachedToCaseArgs, AttachmentsAttachedToCaseArgs, BulkCreateAttachments, BulkUpdateAttachmentArgs, CountActionsAttachedToCaseArgs, CreateAttachmentArgs, DeleteAttachmentArgs, ServiceContext, UpdateAttachmentArgs } from './types';
import { AttachmentGetter } from './operations/get';
import type { AttachmentSavedObjectTransformed } from '../../common/types/attachments_v1';
import type { AttachmentAttributesV2, AttachmentTransformedAttributesV2, UnifiedAttachmentSavedObjectTransformed } from '../../common/types/attachments_v2';
export declare class AttachmentService {
    private readonly context;
    private readonly _getter;
    constructor(context: ServiceContext);
    get getter(): AttachmentGetter;
    /**
     * Whether the unified `cases-attachments` saved object type is registered
     * (gated by the `cases.attachments.enabled` config flag).
     */
    get isUnifiedAttachmentsEnabled(): boolean;
    private getAttachmentSavedObjectType;
    /**
     * Counts the unique number of alerts (deduplicated by id) attached to a case
     * across legacy and unified alert attachments. Honors an optional
     * authorization filter so the metric reflects what the caller can see.
     *
     * Used by the case metrics handler to display the alert count to the user.
     */
    countAlertsAttachedToCase(params: AlertsAttachedToCaseArgs): Promise<number | undefined>;
    /**
     * Counts the total number of alert occurrences attached to a case across both
     * legacy and unified alert attachments. Uses value_count (not cardinality)
     * so each alert occurrence is counted, mirroring how
     * AlertLimiter.countOfItemsInRequest sums `ids.length` per request.
     */
    countAlertsWithinCase(caseId: string): Promise<number>;
    /**
     * Shared aggregation across legacy (`cases-comments.attributes.alertId`) and
     * unified (`cases-attachments.attributes.attachmentId`) alert storage.
     *
     * @param aggType `'cardinality'` for unique alert ids, `'value_count'` for occurrences.
     * @param extraFilter additional KueryNode (e.g. authorization) AND-combined onto the type filter.
     */
    private aggregateAlertsForCase;
    /**
     * Executes the aggregations against a type of attachment attached to a case.
     */
    executeCaseAggregations<Agg extends AggregationResponse = AggregationResponse>({ caseId, filter, aggregations, attachmentType, }: AttachmentsAttachedToCaseArgs): Promise<Agg | undefined>;
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
    countPersistableStateAndExternalReferenceAttachments({ caseId, }: {
        caseId: string;
    }): Promise<number>;
    /**
     * Executes the aggregations against the actions attached to a case.
     */
    executeCaseActionsAggregations(params: CountActionsAttachedToCaseArgs): Promise<AggregationResponse | undefined>;
    bulkDelete({ savedObjectIds, refresh }: DeleteAttachmentArgs): Promise<void>;
    create({ attributes, references, id, refresh, }: CreateAttachmentArgs): Promise<AttachmentSavedObjectTransformed | UnifiedAttachmentSavedObjectTransformed>;
    bulkCreate({ attachments, refresh, }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentAttributesV2>>;
    private transformAndDecodeBulkCreateResponse;
    update({ savedObjectId, updatedAttributes, options, }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentAttributesV2>>;
    bulkUpdate({ comments, refresh, requestWithoutType, }: BulkUpdateAttachmentArgs): Promise<SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributesV2>>;
    private transformAndDecodeBulkUpdateResponse;
    find({ options, mode, }: {
        options?: SavedObjectFindOptionsKueryNode;
        mode: AttachmentMode;
    }): Promise<SavedObjectsFindResponse<AttachmentAttributesV2>>;
}
