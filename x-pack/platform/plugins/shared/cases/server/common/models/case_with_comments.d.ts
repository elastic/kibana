import type { Case } from '../../../common/types/domain';
import type { CasesClientArgs } from '../../client';
import type { CaseSavedObjectTransformed } from '../types/case';
import type { AttachmentRequest, AttachmentPatchRequestV2, AttachmentRequestV2 } from '../../../common/types/api';
import type { AttachmentMode, UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
type CaseCommentModelParams = Omit<CasesClientArgs, 'authorization'>;
type CommentRequestWithId = Array<{
    id: string;
} & (AttachmentRequest | UnifiedAttachmentPayload)>;
/**
 * This class represents a case that can have a comment attached to it.
 */
export declare class CaseCommentModel {
    private readonly params;
    private readonly caseInfo;
    private constructor();
    static create(id: string, options: CaseCommentModelParams): Promise<CaseCommentModel>;
    get savedObject(): CaseSavedObjectTransformed;
    /**
     * Update a comment and update the corresponding case's update_at and updated_by fields.
     */
    updateComment({ updateRequest, updatedAt, owner, mode, }: {
        updateRequest: AttachmentPatchRequestV2;
        updatedAt: string;
        owner: string;
        mode?: AttachmentMode;
    }): Promise<CaseCommentModel>;
    private partialUpdateCaseWithAttachmentDataSkipRefresh;
    private partialUpdateCaseWithAttachmentData;
    private getAttachmentStats;
    private newObjectWithInfo;
    private createUpdateCommentUserAction;
    /**
     * Create a new comment on the appropriate case. This updates the case's updated_at and updated_by fields.
     */
    createComment({ createdDate, commentReq, id, }: {
        createdDate: string;
        commentReq: AttachmentRequestV2;
        id: string;
    }): Promise<CaseCommentModel>;
    private filterDuplicatedAttachments;
    private getAttachmentsByType;
    private validateCreateCommentRequest;
    private buildRefsToCase;
    private getCommentReferences;
    private handleAlertComments;
    private updateAlertsStatus;
    private updateAlertsSchemaWithCaseInfo;
    private createCommentUserAction;
    private bulkCreateCommentUserAction;
    private formatForEncoding;
    encodeWithComments({ mode }: {
        mode: AttachmentMode;
    }): Promise<Case>;
    bulkCreate({ attachments, }: {
        attachments: CommentRequestWithId;
    }): Promise<CaseCommentModel>;
}
export {};
