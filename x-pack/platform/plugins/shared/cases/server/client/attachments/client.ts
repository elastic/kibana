/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case, AttachmentsV2, AttachmentV2 } from '../../../common/types/domain';
import type {
  DocumentResponse,
  AttachmentsFindResponse,
  BulkGetAttachmentsResponseV2,
} from '../../../common/types/api';
import type { CasesClient } from '../client';

import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import { addComment } from './add';
import type {
  BulkCreateArgs,
  AddArgs,
  DeleteAllArgs,
  DeleteArgs,
  FindCommentsArgs,
  GetAllDocumentsAttachedToCase,
  GetAllArgs,
  GetArgs,
  UpdateArgs,
  BulkGetArgs,
  BulkDeleteFileArgs,
  AddFileArgs,
} from './types';
import { bulkCreate } from './bulk_create';
import { deleteAll, deleteComment } from './delete';
import { find, get, getAll, getAllDocumentsAttachedToCase } from './get';
import { bulkGet } from './bulk_get';
import { update } from './update';
import { bulkDeleteFileAttachments } from './bulk_delete';
import { addFile } from './add_file';
import { withUsageCounter } from '../telemetry';

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
export const createAttachmentsSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): AttachmentsSubClient => {
  const attachmentSubClient: AttachmentsSubClient = {
    add: withUsageCounter('add_attachment', clientArgs, (params: AddArgs) =>
      addComment(params, clientArgs)
    ),
    bulkCreate: withUsageCounter('bulk_create_attachments', clientArgs, (params: BulkCreateArgs) =>
      bulkCreate(params, clientArgs)
    ),
    bulkGet: (params: BulkGetArgs) => bulkGet(params, clientArgs, casesClient),
    delete: withUsageCounter('delete_attachment', clientArgs, (params: DeleteArgs) =>
      deleteComment(params, clientArgs)
    ),
    deleteAll: withUsageCounter('delete_all_attachments', clientArgs, (params: DeleteAllArgs) =>
      deleteAll(params, clientArgs)
    ),
    bulkDeleteFileAttachments: withUsageCounter(
      'bulk_delete_file_attachments',
      clientArgs,
      (params: BulkDeleteFileArgs) => bulkDeleteFileAttachments(params, clientArgs, casesClient)
    ),
    find: (params: FindCommentsArgs) => find(params, clientArgs),
    getAllDocumentsAttachedToCase: (params: GetAllDocumentsAttachedToCase) =>
      getAllDocumentsAttachedToCase(params, clientArgs, casesClient),
    getAll: (params: GetAllArgs) => getAll(params, clientArgs),
    get: (params: GetArgs) => get(params, clientArgs),
    update: withUsageCounter('update_attachment', clientArgs, (params: UpdateArgs) =>
      update(params, clientArgs)
    ),
    addFile: withUsageCounter('add_file_attachment', clientArgs, (params: AddFileArgs) =>
      addFile(params, clientArgs, casesClient)
    ),
  };

  return Object.freeze(attachmentSubClient);
};
