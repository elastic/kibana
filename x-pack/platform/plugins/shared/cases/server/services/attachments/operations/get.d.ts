import type { SavedObject } from '@kbn/core/server';
import type { AttachmentMode, AttachmentTotals, DocumentAttachmentAttributesV2 } from '../../../../common/types/domain';
import type { BulkOptionalAttributes, GetAllAlertsAttachToCaseArgs as GetAllDocumentsAttachedToCaseArgs, GetAttachmentArgs, ServiceContext } from '../types';
import type { AttachmentAttributesV2, AttachmentSavedObjectTransformedV2 } from '../../../common/types/attachments_v2';
export declare class AttachmentGetter {
    private readonly context;
    constructor(context: ServiceContext);
    bulkGet(savedObjectIds: string[], mode: AttachmentMode): Promise<BulkOptionalAttributes<AttachmentAttributesV2>>;
    private mergeBulkGetResults;
    private transformAndDecodeBulkGetResponseLegacy;
    private transformAndDecodeBulkGetResponseUnified;
    getAttachmentIdsForCases({ caseIds }: {
        caseIds: string[];
    }): Promise<{
        id: string;
        type: string;
    }[]>;
    /**
     * Retrieves all the documents attached to a case.
     */
    getAllDocumentsAttachedToCase({ caseId, filter, attachmentTypes, owner, }: GetAllDocumentsAttachedToCaseArgs): Promise<Array<SavedObject<DocumentAttachmentAttributesV2>>>;
    private static decodeDocuments;
    /**
     * Retrieves all the alerts attached to a case.
     */
    getAllAlertIds({ caseId }: {
        caseId: string;
    }): Promise<Set<string>>;
    /**
     * Retrieves all the events attached to a case.
     */
    getAllEventIds({ caseId, owner, }: {
        caseId: string;
        owner: string;
    }): Promise<Set<string>>;
    get({ savedObjectId, mode, }: GetAttachmentArgs): Promise<AttachmentSavedObjectTransformedV2>;
    getCaseAttatchmentStats({ caseIds, }: {
        caseIds: string[];
    }): Promise<Map<string, AttachmentTotals>>;
    private getUnifiedAttachmentStatsByCaseId;
    private static buildCommentStatsAggs;
    getFileAttachments({ caseId, fileIds, mode, }: {
        caseId: string;
        fileIds: string[];
        mode?: AttachmentMode;
    }): Promise<AttachmentSavedObjectTransformedV2[]>;
    private transformAndDecodeFileAttachments;
    private logInvalidFileAssociations;
}
