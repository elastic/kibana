import type { Case, User } from '../../../common/types/domain';
import type { AllCategoriesFindRequest, AllReportersFindRequest, AllTagsFindRequest, CaseResolveResponse, CasesByAlertIDRequest, GetRelatedCasesByAlertResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { AttachmentMode } from '../../../common/types/domain/attachment/v2';
/**
 * Parameters for finding cases IDs using an alert ID
 */
export interface CasesByAlertIDParams {
    /**
     * The alert ID to search for
     */
    alertID: string;
    /**
     * The filtering options when searching for associated cases.
     */
    options: CasesByAlertIDRequest;
}
/**
 * Case Client wrapper function for retrieving the case IDs and titles that have a particular alert ID
 * attached to them. This handles RBAC before calling the saved object API.
 *
 * @ignore
 */
export declare const getCasesByAlertID: ({ alertID, options }: CasesByAlertIDParams, clientArgs: CasesClientArgs) => Promise<GetRelatedCasesByAlertResponse>;
/**
 * The parameters for retrieving a case
 */
export interface GetParams {
    /**
     * Case ID
     */
    id: string;
    /**
     * Whether to include the attachments for a case in the response
     */
    includeComments?: boolean;
    /**
     * Attachment format: 'legacy' (eventId/index) or 'unified' (attachmentId/metadata).
     * Use 'unified' when consuming from the attachment registry (e.g. EventTabContent).
     */
    mode?: AttachmentMode;
}
/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export declare const get: ({ id, includeComments, mode }: GetParams, clientArgs: CasesClientArgs) => Promise<Case>;
/**
 * Retrieves a case resolving its ID and optionally loading its comments.
 *
 * @experimental
 */
export declare const resolve: ({ id, includeComments, mode }: GetParams, clientArgs: CasesClientArgs) => Promise<CaseResolveResponse>;
/**
 * Retrieves the tags from all the cases.
 */
export declare function getTags(params: AllTagsFindRequest, clientArgs: CasesClientArgs): Promise<string[]>;
/**
 * Retrieves the reporters from all the cases.
 */
export declare function getReporters(params: AllReportersFindRequest, clientArgs: CasesClientArgs): Promise<User[]>;
/**
 * Retrieves the categories from all the cases.
 */
export declare function getCategories(params: AllCategoriesFindRequest, clientArgs: CasesClientArgs): Promise<string[]>;
