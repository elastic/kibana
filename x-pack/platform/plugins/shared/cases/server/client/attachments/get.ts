/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';

import type {
  AttachmentsV2,
  UnifiedAttachment,
  DocumentAttachmentAttributesV2,
} from '../../../common/types/domain';
import type { DocumentResponse, UnifiedAttachmentsFindResponse } from '../../../common/types/api';
import {
  DocumentResponseRt,
  UnifiedAttachmentsFindQueryParamsRt,
  UnifiedAttachmentsFindResponseRt,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';

import type { FindCommentsArgs, GetAllDocumentsAttachedToCase, GetAllArgs, GetArgs } from './types';

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { getAttachmentAuthorizationFilter } from '../../authorization/utils';
import { decodeOrThrow, decodeWithExcessOrThrow } from '../../common/runtime_types';
import {
  defaultSortField,
  flattenAttachmentSavedObject,
  flattenAttachmentSavedObjects,
  getIDsAndIndicesAsArrays,
} from '../../common/utils';
import { createCaseError } from '../../common/error';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';
import { combineFilters } from '../utils';
import { Operations } from '../../authorization';
import { UnifiedAttachmentRt, AttachmentsRtV2 } from '../../../common/types/domain';
import { buildAttachmentTypeFilter } from './type_filter';

const normalizeDocumentResponse = (
  documents: Array<SavedObject<DocumentAttachmentAttributesV2>>
): DocumentResponse =>
  documents.reduce((acc: DocumentResponse, document) => {
    const { ids, indices } = getIDsAndIndicesAsArrays(document.attributes);

    if (ids.length !== indices.length) {
      return acc;
    }

    acc.push(
      ...ids.map((id, index) => ({
        id,
        index: indices[index],
        attached_at: document.attributes.created_at,
      }))
    );
    return acc;
  }, []);

/**
 * Retrieves all documents attached to a specific case.
 */
export const getAllDocumentsAttachedToCase = async (
  { caseId, filter, attachmentTypes, unifiedAttachmentTypes }: GetAllDocumentsAttachedToCase,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<DocumentResponse> => {
  const {
    authorization,
    services: { attachmentService },
    logger,
  } = clientArgs;

  try {
    // This will perform an authorization check to ensure the user has access to the parent case
    const theCase = await casesClient.cases.get({
      id: caseId,
      includeComments: false,
    });

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await getAttachmentAuthorizationFilter(authorization, Operations.getAlertsAttachedToCase);

    const filterArray = authorizationFilter ? [authorizationFilter] : [];
    if (filter) filterArray.push(filter);

    const documents = await attachmentService.getter.getAllDocumentsAttachedToCase({
      attachmentTypes,
      unifiedAttachmentTypes,
      caseId: theCase.id,
      filter: combineFilters(filterArray),
      owner: theCase.owner,
    });

    ensureSavedObjectsAreAuthorized(
      documents.map((document) => ({
        owner: document.attributes.owner,
        id: document.id,
      }))
    );

    const res = normalizeDocumentResponse(documents);

    return decodeOrThrow(DocumentResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get documents attached to case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Retrieves the attachments for a case entity, optionally filtered by `type`.
 * Omitting `type` returns every attachment type across both storage models.
 */
export async function find(
  { caseID, findQueryParams }: FindCommentsArgs,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachmentsFindResponse> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(UnifiedAttachmentsFindQueryParamsRt)(
      findQueryParams
    );

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await getAttachmentAuthorizationFilter(authorization, Operations.findComments);

    const requestedTypes =
      queryParams?.type == null
        ? undefined
        : Array.isArray(queryParams.type)
        ? queryParams.type
        : [queryParams.type];

    const filter = combineFilters([buildAttachmentTypeFilter(requestedTypes), authorizationFilter]);

    const theAttachments = await attachmentService.find({
      options: {
        page: queryParams?.page ?? DEFAULT_PAGE,
        perPage: queryParams?.perPage ?? DEFAULT_PER_PAGE,
        ...(queryParams?.sortOrder && { sortOrder: queryParams?.sortOrder }),
        sortField: 'created_at',
        hasReference: { type: CASE_SAVED_OBJECT, id: caseID },
        filter,
      },
    });

    ensureSavedObjectsAreAuthorized(
      theAttachments.saved_objects.map((attachment) => ({
        owner: attachment.attributes.owner,
        id: attachment.id,
      }))
    );

    const res = {
      data: flattenAttachmentSavedObjects(theAttachments.saved_objects),
      page: theAttachments.page,
      per_page: theAttachments.per_page,
      total: theAttachments.total,
    };

    return decodeOrThrow(UnifiedAttachmentsFindResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to find attachments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

/**
 * Retrieves a single attachment by its saved object id. `AttachmentGetter.get`
 * already normalizes legacy-stored rows via `toUnifiedAttributes`, so this decodes
 * against the unified-only shape rather than the legacy-tolerant union.
 */
export async function get(
  { savedObjectId, caseID }: GetArgs,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const comment = await attachmentService.getter.get({
      savedObjectId,
    });

    await authorization.ensureAuthorized({
      entities: [{ owner: comment.attributes.owner, id: comment.id }],
      operation: Operations.getComment,
    });

    const res = flattenAttachmentSavedObject(comment);

    return decodeOrThrow(UnifiedAttachmentRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get attachment case id: ${caseID} attachment id: ${savedObjectId}: ${error}`,
      error,
      logger,
    });
  }
}

/**
 * Retrieves all the attachments for a case.
 */
export async function getAll(
  { caseID }: GetAllArgs,
  clientArgs: CasesClientArgs
): Promise<AttachmentsV2> {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const { filter, ensureSavedObjectsAreAuthorized } = await getAttachmentAuthorizationFilter(
      authorization,
      Operations.getAllComments
    );

    const comments = await caseService.getAllCaseComments({
      id: caseID,
      options: {
        filter,
        sortField: defaultSortField,
      },
    });

    ensureSavedObjectsAreAuthorized(
      comments.saved_objects.map((comment) => ({ id: comment.id, owner: comment.attributes.owner }))
    );

    const res = flattenAttachmentSavedObjects(comments.saved_objects);

    return decodeOrThrow(AttachmentsRtV2)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get all comments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}
