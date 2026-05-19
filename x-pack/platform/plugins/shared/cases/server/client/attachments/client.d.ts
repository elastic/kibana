import type { Case, AttachmentsV2, AttachmentV2 } from '../../../common/types/domain';
import type { DocumentResponse, AttachmentsFindResponse, BulkGetAttachmentsResponseV2 } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import type { BulkCreateArgs, AddArgs, DeleteAllArgs, DeleteArgs, FindCommentsArgs, GetAllDocumentsAttachedToCase, GetAllArgs, GetArgs, UpdateArgs, BulkGetArgs, BulkDeleteFileArgs, AddFileArgs } from './types';
/**
 * API for interacting with the attachments to a case.
 */
export interface AttachmentsSubClient {
    /**
     * Adds an attachment to a case.
     */
    add(params: AddArgs): Promise<Case>;
    bulkCreate(params: BulkCreateArgs): Promise<Case>;
    bulkGet(params: BulkGetArgs): Promise<BulkGetAttachmentsResponseV2>;
    /**
     * Deletes all attachments associated with a single case.
     */
    deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
    /**
     * Deletes a single attachment for a specific case.
     */
    delete(deleteArgs: DeleteArgs): Promise<void>;
    bulkDeleteFileAttachments(deleteArgs: BulkDeleteFileArgs): Promise<void>;
    /**
     * Retrieves all comments matching the search criteria.
     */
    find(findArgs: FindCommentsArgs): Promise<AttachmentsFindResponse>;
    /**
     * Retrieves all documents attached to a case given a single case ID
     */
    getAllDocumentsAttachedToCase(params: GetAllDocumentsAttachedToCase): Promise<DocumentResponse>;
    /**
     * Gets all attachments for a single case.
     */
    getAll(getAllArgs: GetAllArgs): Promise<AttachmentsV2>;
    /**
     * Retrieves a single attachment for a case.
     */
    get(getArgs: GetArgs): Promise<AttachmentV2>;
    /**
     * Updates a specific attachment.
     *
     * The request must include all fields for the attachment. Even the fields that are not changing.
     */
    update(updateArgs: UpdateArgs): Promise<Case>;
    /**
     * Adds a file attachment to a case. Returns the case with comments.
     */
    addFile(params: AddFileArgs): Promise<Case>;
}
/**
 * Creates an API object for interacting with attachments.
 *
 * @ignore
 */
export declare const createAttachmentsSubClient: (clientArgs: CasesClientArgs, casesClient: CasesClient, casesClientInternal: CasesClientInternal) => AttachmentsSubClient;
