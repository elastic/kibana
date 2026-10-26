/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case, AttachmentsV2, UnifiedAttachment } from '../../../common/types/domain';
import type {
  DocumentResponse,
  UnifiedAttachmentsFindResponse,
  BulkGetUnifiedAttachmentsResponse,
} from '../../../common/types/api';
import type { CasesClient } from '../client';

import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import { addComment, addCommentAndGetCase } from './add';
import type {
  BulkCreateArgs,
  AddArgs,
  DeleteAllArgs,
  DeleteArgs,
  FindAttachmentsArgs,
  GetAllDocumentsAttachedToCase,
  GetAllArgs,
  GetArgs,
  UpdateArgs,
  BulkGetArgs,
  BulkDeleteArgs,
  BulkDeleteFileArgs,
  AddFileArgs,
} from './types';
import { bulkCreate, bulkCreateAndGetCase } from './bulk_create';
import { deleteAll, deleteComment } from './delete';
import { find, get, getAll, getAllDocumentsAttachedToCase } from './get';
import { bulkGet } from './bulk_get';
import { update, updateAndGetCase } from './update';
import { bulkDeleteAttachments, bulkDeleteFileAttachments } from './bulk_delete';
import { addFile, addFileAndGetCase } from './add_file';
import { withUsageCounter } from '../usage_counters';

/**
 * API for interacting with the attachments to a case.
 */
export interface AttachmentsSubClient {
  /**
   * Adds an attachment to a case. Returns the created attachment, or the existing one when
   * every referenced id is already on the case.
   */
  add(params: AddArgs): Promise<UnifiedAttachment>;
  /**
   * Adds an attachment to a case. Returns the case with all its attachments.
   */
  addAndGetCase(params: AddArgs): Promise<Case>;
  /**
   * Adds attachments to a case. Returns the created attachments.
   */
  bulkCreate(params: BulkCreateArgs): Promise<UnifiedAttachment[]>;
  /**
   * Adds attachments to a case. Returns the case with all its attachments.
   */
  bulkCreateAndGetCase(params: BulkCreateArgs): Promise<Case>;
  bulkGet(params: BulkGetArgs): Promise<BulkGetUnifiedAttachmentsResponse>;
  /**
   * Deletes all attachments associated with a single case.
   */
  deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
  /**
   * Deletes a single attachment for a specific case.
   */
  delete(deleteArgs: DeleteArgs): Promise<void>;
  /**
   * Deletes multiple attachments of any type for a specific case, recording one user action per
   * attachment type.
   */
  bulkDelete(deleteArgs: BulkDeleteArgs): Promise<void>;
  bulkDeleteFileAttachments(deleteArgs: BulkDeleteFileArgs): Promise<void>;
  /**
   * Finds attachments for a case, optionally filtered by `type`.
   */
  find(findArgs: FindAttachmentsArgs): Promise<UnifiedAttachmentsFindResponse>;
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
  get(getArgs: GetArgs): Promise<UnifiedAttachment>;
  /**
   * Full replace. The request must include every field. Returns the updated attachment.
   */
  update(updateArgs: UpdateArgs): Promise<UnifiedAttachment>;
  /**
   * Full replace. The request must include every field. Returns the case with all its attachments.
   */
  updateAndGetCase(updateArgs: UpdateArgs): Promise<Case>;
  /**
   * Adds a file attachment to a case. Returns the created attachment.
   */
  addFile(params: AddFileArgs): Promise<UnifiedAttachment>;
  /**
   * Adds a file attachment to a case. Returns the case with all its attachments.
   */
  addFileAndGetCase(params: AddFileArgs): Promise<Case>;
}

// Keep this exhaustive so every new client method requires an explicit telemetry decision.
const usageCounterByMethod = {
  add: 'add_attachment',
  addAndGetCase: 'add_attachment',
  bulkCreate: 'bulk_create_attachments',
  bulkCreateAndGetCase: 'bulk_create_attachments',
  bulkGet: null,
  deleteAll: 'delete_all_attachments',
  delete: 'delete_attachment',
  bulkDelete: 'bulk_delete_attachments',
  bulkDeleteFileAttachments: 'bulk_delete_file_attachments',
  find: null,
  getAllDocumentsAttachedToCase: null,
  getAll: null,
  get: null,
  update: 'update_attachment',
  updateAndGetCase: 'update_attachment',
  addFile: 'add_file_attachment',
  addFileAndGetCase: 'add_file_attachment',
} as const satisfies Record<keyof AttachmentsSubClient, string | null>;

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
    add: withUsageCounter(usageCounterByMethod.add, clientArgs, (params: AddArgs) =>
      addComment(params, clientArgs)
    ),
    addAndGetCase: withUsageCounter(
      usageCounterByMethod.addAndGetCase,
      clientArgs,
      (params: AddArgs) => addCommentAndGetCase(params, clientArgs)
    ),
    bulkCreate: withUsageCounter(
      usageCounterByMethod.bulkCreate,
      clientArgs,
      (params: BulkCreateArgs) => bulkCreate(params, clientArgs)
    ),
    bulkCreateAndGetCase: withUsageCounter(
      usageCounterByMethod.bulkCreateAndGetCase,
      clientArgs,
      (params: BulkCreateArgs) => bulkCreateAndGetCase(params, clientArgs)
    ),
    bulkGet: (params: BulkGetArgs) => bulkGet(params, clientArgs, casesClient),
    delete: withUsageCounter(usageCounterByMethod.delete, clientArgs, (params: DeleteArgs) =>
      deleteComment(params, clientArgs)
    ),
    deleteAll: withUsageCounter(
      usageCounterByMethod.deleteAll,
      clientArgs,
      (params: DeleteAllArgs) => deleteAll(params, clientArgs)
    ),
    bulkDelete: withUsageCounter(
      usageCounterByMethod.bulkDelete,
      clientArgs,
      (params: BulkDeleteArgs) => bulkDeleteAttachments(params, clientArgs)
    ),
    bulkDeleteFileAttachments: withUsageCounter(
      usageCounterByMethod.bulkDeleteFileAttachments,
      clientArgs,
      (params: BulkDeleteFileArgs) => bulkDeleteFileAttachments(params, clientArgs, casesClient)
    ),
    find: (params: FindAttachmentsArgs) => find(params, clientArgs),
    getAllDocumentsAttachedToCase: (params: GetAllDocumentsAttachedToCase) =>
      getAllDocumentsAttachedToCase(params, clientArgs, casesClient),
    getAll: (params: GetAllArgs) => getAll(params, clientArgs),
    get: (params: GetArgs) => get(params, clientArgs),
    update: withUsageCounter(usageCounterByMethod.update, clientArgs, (params: UpdateArgs) =>
      update(params, clientArgs)
    ),
    updateAndGetCase: withUsageCounter(
      usageCounterByMethod.updateAndGetCase,
      clientArgs,
      (params: UpdateArgs) => updateAndGetCase(params, clientArgs)
    ),
    addFile: withUsageCounter(usageCounterByMethod.addFile, clientArgs, (params: AddFileArgs) =>
      addFile(params, clientArgs, casesClient)
    ),
    addFileAndGetCase: withUsageCounter(
      usageCounterByMethod.addFileAndGetCase,
      clientArgs,
      (params: AddFileArgs) => addFileAndGetCase(params, clientArgs, casesClient)
    ),
  };

  return Object.freeze(attachmentSubClient);
};
