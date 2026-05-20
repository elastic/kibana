import type { AttachmentsV2, AttachmentV2 } from '../../../common/types/domain';
import type { DocumentResponse, AttachmentsFindResponse } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { FindCommentsArgs, GetAllDocumentsAttachedToCase, GetAllArgs, GetArgs } from './types';
/**
 * Retrieves all documents attached to a specific case.
 */
export declare const getAllDocumentsAttachedToCase: ({ caseId, filter, attachmentTypes }: GetAllDocumentsAttachedToCase, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<DocumentResponse>;
/**
 * Retrieves the attachments for a case entity. This support pagination.
 */
export declare function find({ caseID, findQueryParams, mode }: FindCommentsArgs, clientArgs: CasesClientArgs): Promise<AttachmentsFindResponse>;
/**
 * Retrieves a single attachment by its saved object id.
 */
export declare function get({ savedObjectId, caseID, mode }: GetArgs, clientArgs: CasesClientArgs): Promise<AttachmentV2>;
/**
 * Retrieves all the attachments for a case.
 */
export declare function getAll({ caseID, mode }: GetAllArgs, clientArgs: CasesClientArgs): Promise<AttachmentsV2>;
