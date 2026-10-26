/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { chunk, uniqBy } from 'lodash';
import pMap from 'p-map';
import type {
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsResolveResponse,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type {
  AttachmentAttributes,
  AttachmentTotals,
  Case,
  CaseAttributes,
  User,
} from '../../../common/types/domain';
import type {
  AllCategoriesFindRequest,
  AllReportersFindRequest,
  AllTagsFindRequest,
  CaseResolveResponse,
  CasesByAlertIDRequest,
  GetRelatedCasesByAlertResponse,
} from '../../../common/types/api';
import {
  AllCategoriesFindRequestSchema,
  AllReportersFindRequestSchema,
  AllTagsFindRequestSchema,
  CaseResolveResponseSchema,
  CasesByAlertIDRequestSchema,
  GetCategoriesResponseSchema,
  GetRelatedCasesByAlertResponseSchema,
  GetReportersResponseSchema,
  GetTagsResponseSchema,
} from '../../../common/types/api';
import { decodeWithExcessOrThrowZod, decodeOrThrowZod } from '../../common/runtime_types';
import { createCaseError, isSOError } from '../../common/error';
import {
  asArray,
  countAlertsForID,
  flattenCaseSavedObject,
  countUserAttachments,
  countEventsForID,
} from '../../common/utils';
import { parseFieldDefinitionsToInlineFields } from '../../../common/utils';
import { enrichCasesWithFieldLabels } from './utils';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { getOwnersFilter } from '../../authorization/utils';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ATTACHMENT_IDS_PER_CASES_LOOKUP,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_BULK_GET_CASES,
  MAX_CONCURRENT_SEARCHES,
  MAX_OWNER_LENGTH,
} from '../../../common/constants';
import { limitedArraySchema, limitedStringSchema } from '../../../common/schema';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import { CasesService } from '../../services';
import type { CasesWithOwnerOfAttachment } from '../../services/attachments/types';
import type {
  CaseSavedObjectTransformed,
  CaseTransformedAttributes,
} from '../../common/types/case';
import { CaseSchema, CaseStatusSchema } from '../../../common/types/domain';

export const CasesByAttachmentIDsRequestSchema = z.object({
  /**
   * Only the cases of this owner. One owner per call, as a user may read one solution's cases
   * and not another's.
   */
  owner: limitedStringSchema({ fieldName: 'owner', min: 1, max: MAX_OWNER_LENGTH }),
  /**
   * The attachment type, e.g. `security.entity`.
   */
  type: limitedStringSchema({ fieldName: 'type', min: 1, max: MAX_ATTACHMENT_TYPE_LENGTH }),
  /**
   * The ids the attachments point at (their `attachmentId`), not the attachment saved object ids.
   */
  attachmentIds: limitedArraySchema({
    codec: limitedStringSchema({
      fieldName: 'attachmentIds',
      min: 1,
      max: MAX_ATTACHMENT_ID_LENGTH,
    }),
    min: 1,
    max: MAX_ATTACHMENT_IDS_PER_CASES_LOOKUP,
    fieldName: 'attachmentIds',
  }),
  /**
   * Only the cases with one of these statuses.
   */
  status: z.union([CaseStatusSchema, z.array(CaseStatusSchema)]).optional(),
});

export const GetCaseIDsByAttachmentIDsResponseSchema = z.array(
  z.object({
    attachmentId: z.string().max(MAX_ATTACHMENT_ID_LENGTH),
    caseIds: z.array(z.string().max(MAX_ATTACHMENT_ID_LENGTH)),
  })
);

export type CasesByAttachmentIDsRequest = z.infer<typeof CasesByAttachmentIDsRequestSchema>;
export type GetCaseIDsByAttachmentIDsResponse = z.infer<
  typeof GetCaseIDsByAttachmentIDsResponseSchema
>;

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
export const getCasesByAlertID = async (
  { alertID, options }: CasesByAlertIDParams,
  clientArgs: CasesClientArgs
): Promise<GetRelatedCasesByAlertResponse> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrowZod(CasesByAlertIDRequestSchema)(options);

    const {
      filter: authorizationFilter,
      ensureSavedObjectsAreAuthorized,
      authorizedOwners,
    } = await authorization.getAuthorizationFilter(Operations.getCaseIDsByAlertID);

    const filter = combineAuthorizedAndOwnerFilter(
      queryParams.owner,
      authorizationFilter,
      Operations.getCaseIDsByAlertID.savedObjectType
    );

    /**
     * The authorization filter above is scoped to `cases-comments` (the operation's saved object
     * type). We also query `cases-attachments`, so build an equivalent owner-scoped filter for
     * that type using the same authorized owners.
     */
    const unifiedAuthorizationFilter =
      authorizedOwners && authorizedOwners.length > 0
        ? getOwnersFilter(CASE_ATTACHMENT_SAVED_OBJECT, authorizedOwners)
        : undefined;
    const unifiedFilter = combineAuthorizedAndOwnerFilter(
      queryParams.owner,
      unifiedAuthorizationFilter,
      CASE_ATTACHMENT_SAVED_OBJECT
    );

    // This will likely only return one comment saved object, the response aggregation will contain
    // the keys we need to retrieve the cases
    const commentsWithAlert = await caseService.getCaseIdsByAlertId({
      alertId: alertID,
      filter,
      unifiedFilter,
    });

    // make sure the comments returned have the right owner
    ensureSavedObjectsAreAuthorized(
      commentsWithAlert.saved_objects.map((comment) => ({
        owner: comment.attributes.owner,
        id: comment.id,
      }))
    );

    const caseIds = CasesService.getCaseIDsFromAlertAggs(commentsWithAlert);

    // if we didn't find any case IDs then let's return early because there's nothing to request
    if (caseIds.length <= 0) {
      return [];
    }

    const commentStats = await attachmentService.getter.getCaseAttatchmentStats({
      caseIds,
    });

    const casesInfo = await caseService.getCases({
      caseIds,
    });

    // if there was an error retrieving one of the cases (maybe it was deleted, but the alert comment still existed)
    // just ignore it
    const validCasesInfo = casesInfo.saved_objects.filter(
      (caseInfo): caseInfo is SavedObject<CaseTransformedAttributes> => !isSOError(caseInfo)
    );

    ensureSavedObjectsAreAuthorized(
      validCasesInfo.map((caseInfo) => ({
        owner: caseInfo.attributes.owner,
        id: caseInfo.id,
      }))
    );

    const res = validCasesInfo.map((caseInfo) => ({
      id: caseInfo.id,
      title: caseInfo.attributes.title,
      description: caseInfo.attributes.description,
      status: caseInfo.attributes.status,
      createdAt: caseInfo.attributes.created_at,
      totals: getAttachmentTotalsForCaseId(caseInfo.id, commentStats),
    }));

    return decodeOrThrowZod(GetRelatedCasesByAlertResponseSchema)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get case IDs using alert ID: ${alertID} options: ${JSON.stringify(
        options
      )}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Case Client wrapper function for retrieving, per attachment ID (the ID an attachment points at,
 * e.g. an entity ID), the IDs of the cases it is attached to that the user can read. This handles RBAC
 * before calling the saved object API.
 *
 * @ignore
 */
export const getCasesByAttachmentIDs = async (
  params: CasesByAttachmentIDsRequest,
  clientArgs: CasesClientArgs
): Promise<GetCaseIDsByAttachmentIDsResponse> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const { type, owner, attachmentIds, status } = decodeWithExcessOrThrowZod(
      CasesByAttachmentIDsRequestSchema
    )(params);

    const { authorizedOwners, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.getCaseIDsByAttachmentIDs);

    // The operation is scoped to cases, so the attachments read get their own owner filter.
    const getAttachmentsFilter = (
      soType: typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT
    ) =>
      combineAuthorizedAndOwnerFilter(
        owner,
        authorizedOwners && authorizedOwners.length > 0
          ? getOwnersFilter(soType, authorizedOwners)
          : undefined,
        soType
      );

    const casesOfAttachments = await attachmentService.getter.getCaseIdsByAttachmentIds({
      type,
      attachmentIds,
      unifiedFilter: getAttachmentsFilter(CASE_ATTACHMENT_SAVED_OBJECT),
      legacyFilter: getAttachmentsFilter(CASE_COMMENT_SAVED_OBJECT),
    });

    const casesInStatus = await filterByCaseStatus(caseService, casesOfAttachments, status);

    // After the status filter, so only the cases returned are audited.
    ensureSavedObjectsAreAuthorized(
      uniqBy(
        casesInStatus.flatMap(({ cases }) => cases),
        'id'
      )
    );

    const res = casesInStatus.map(({ attachmentId, cases }) => ({
      attachmentId,
      caseIds: cases.map(({ id }) => id),
    }));

    return decodeOrThrowZod(GetCaseIDsByAttachmentIDsResponseSchema)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get case IDs using attachment IDs: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Only the cases with one of the statuses, or every case without a status; attachment ids left in no
 * case are dropped. Cases whose attachment outlived them are not found, so they are left out.
 */
const filterByCaseStatus = async (
  caseService: CasesService,
  casesOfAttachments: CasesWithOwnerOfAttachment[],
  status: CasesByAttachmentIDsRequest['status']
): Promise<CasesWithOwnerOfAttachment[]> => {
  if (status === undefined) return casesOfAttachments;
  const statuses = asArray(status);
  const caseIds = [
    ...new Set(casesOfAttachments.flatMap(({ cases }) => cases.map(({ id }) => id))),
  ];
  const statusesById = await pMap(
    chunk(caseIds, MAX_BULK_GET_CASES),
    (ids) => caseService.getCaseStatuses({ caseIds: ids }),
    { concurrency: MAX_CONCURRENT_SEARCHES }
  );
  const caseIdsWithStatus = new Set(
    statusesById.flatMap((statusById) =>
      [...statusById].flatMap(([id, caseStatus]) => (statuses.includes(caseStatus) ? [id] : []))
    )
  );

  return casesOfAttachments.flatMap(({ attachmentId, cases }) => {
    const casesInStatus = cases.filter(({ id }) => caseIdsWithStatus.has(id));
    return casesInStatus.length > 0 ? [{ attachmentId, cases: casesInStatus }] : [];
  });
};

const getAttachmentTotalsForCaseId = (id: string, stats: Map<string, AttachmentTotals>) => {
  const defaults: AttachmentTotals = { alerts: 0, events: 0, userComments: 0 };

  const {
    alerts = defaults.alerts,
    events = defaults.events,
    userComments = defaults.userComments,
  } = stats.get(id) ?? defaults;

  return { alerts, events, userComments };
};

/**
 * Populates `extended_fields_labels` on a single case, mirroring the enrichment the search/find
 * path performs (see search.ts). Without this, the case-view activity feed (which loads the case
 * via GET, not search) has no labels and falls back to startCase(name).
 */
const enrichCaseWithFieldLabels = async (
  theCase: Case,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const {
    services: { templatesService, fieldDefinitionsService },
    config,
    logger,
  } = clientArgs;

  if (!config.templates.enabled || theCase.extended_fields == null) {
    return theCase;
  }

  try {
    const owner = theCase.owner ? [theCase.owner] : undefined;
    // Only the case's own template version is needed to label template-authored fields; global
    // fields cover the rest. Fetching just that one version avoids the search-path scan of every
    // owner template version, which is unnecessary when enriching a single case.
    const [templateSO, globalFieldDefs] = await Promise.all([
      theCase.template?.id != null
        ? templatesService.getTemplate(theCase.template.id, String(theCase.template.version))
        : undefined,
      fieldDefinitionsService.getGlobalFieldDefinitionsForSearch({ owner }),
    ]);

    return enrichCasesWithFieldLabels(
      [theCase],
      templateSO != null ? [templateSO] : [],
      parseFieldDefinitionsToInlineFields(globalFieldDefs)
    )[0];
  } catch (error) {
    // Label enrichment is cosmetic; never fail the case GET/resolve because of it.
    logger.warn(`Failed to enrich case id: ${theCase.id} with extended field labels: ${error}`);
    return theCase;
  }
};

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
}

/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export const get = async (
  { id, includeComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const theCase: CaseSavedObjectTransformed = await caseService.getCase({
      id,
    });

    await authorization.ensureAuthorized({
      operation: Operations.getCase,
      entities: [{ owner: theCase.attributes.owner, id: theCase.id }],
    });

    if (!includeComments) {
      const commentStats = await attachmentService.getter.getCaseAttatchmentStats({
        caseIds: [theCase.id],
      });
      const flattenedCase = flattenCaseSavedObject({
        savedObject: theCase,
        ...(commentStats.has(theCase.id)
          ? {
              totalAlerts: commentStats.get(theCase.id)?.alerts,
              totalComment: commentStats.get(theCase.id)?.userComments,
              totalEvents: commentStats.get(theCase.id)?.events,
            }
          : {}),
      });
      return decodeOrThrowZod(CaseSchema)(
        await enrichCaseWithFieldLabels(flattenedCase, clientArgs)
      );
    }

    const theComments = (await caseService.getAllCaseComments({
      id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
    })) as SavedObjectsFindResponse<AttachmentAttributes>;

    const res = flattenCaseSavedObject({
      savedObject: theCase,
      comments: theComments.saved_objects,
      totalComment: countUserAttachments(theComments.saved_objects),
      totalAlerts: countAlertsForID({ comments: theComments, id }),
      totalEvents: countEventsForID({ comments: theComments }),
    });

    return decodeOrThrowZod(CaseSchema)(await enrichCaseWithFieldLabels(res, clientArgs));
  } catch (error) {
    throw createCaseError({ message: `Failed to get case id: ${id}: ${error}`, error, logger });
  }
};

/**
 * Retrieves a case resolving its ID and optionally loading its comments.
 *
 * @experimental
 */
export const resolve = async (
  { id, includeComments }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CaseResolveResponse> => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const {
      saved_object: resolvedSavedObject,
      ...resolveData
    }: SavedObjectsResolveResponse<CaseAttributes> = await caseService.getResolveCase({
      id,
    });

    if (isSavedObjectErrorResult(resolvedSavedObject)) {
      throw new Error(resolvedSavedObject.error.message);
    }

    await authorization.ensureAuthorized({
      operation: Operations.resolveCase,
      entities: [
        {
          id: resolvedSavedObject.id,
          owner: resolvedSavedObject.attributes.owner,
        },
      ],
    });

    if (!includeComments) {
      const flattenedCase = flattenCaseSavedObject({ savedObject: resolvedSavedObject });
      return decodeOrThrowZod(CaseResolveResponseSchema)({
        ...resolveData,
        case: await enrichCaseWithFieldLabels(flattenedCase, clientArgs),
      });
    }

    const theComments = (await caseService.getAllCaseComments({
      id: resolvedSavedObject.id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
    })) as SavedObjectsFindResponse<AttachmentAttributes>;

    const flattenedCase = flattenCaseSavedObject({
      savedObject: resolvedSavedObject,
      comments: theComments.saved_objects,
      totalComment: theComments.total,
      totalEvents: countEventsForID({ comments: theComments }),
      totalAlerts: countAlertsForID({ comments: theComments, id: resolvedSavedObject.id }),
    });

    const res = {
      ...resolveData,
      case: await enrichCaseWithFieldLabels(flattenedCase, clientArgs),
    };

    return decodeOrThrowZod(CaseResolveResponseSchema)(res);
  } catch (error) {
    throw createCaseError({ message: `Failed to resolve case id: ${id}: ${error}`, error, logger });
  }
};

/**
 * Retrieves the tags from all the cases.
 */

export async function getTags(
  params: AllTagsFindRequest,
  clientArgs: CasesClientArgs
): Promise<string[]> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrowZod(AllTagsFindRequestSchema)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getTags
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const tags = await caseService.getTags({
      unsecuredSavedObjectsClient,
      filter,
    });

    return decodeOrThrowZod(GetTagsResponseSchema)(tags);
  } catch (error) {
    throw createCaseError({ message: `Failed to get tags: ${error}`, error, logger });
  }
}

/**
 * Retrieves the reporters from all the cases.
 */
export async function getReporters(
  params: AllReportersFindRequest,
  clientArgs: CasesClientArgs
): Promise<User[]> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrowZod(AllReportersFindRequestSchema)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getReporters
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const reporters = await caseService.getReporters({
      unsecuredSavedObjectsClient,
      filter,
    });

    return decodeOrThrowZod(GetReportersResponseSchema)(reporters);
  } catch (error) {
    throw createCaseError({ message: `Failed to get reporters: ${error}`, error, logger });
  }
}

/**
 * Retrieves the categories from all the cases.
 */
export async function getCategories(
  params: AllCategoriesFindRequest,
  clientArgs: CasesClientArgs
): Promise<string[]> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrowZod(AllCategoriesFindRequestSchema)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getCategories
    );

    const filter = combineAuthorizedAndOwnerFilter(queryParams.owner, authorizationFilter);

    const categories = await caseService.getCategories({
      unsecuredSavedObjectsClient,
      filter,
    });

    return decodeOrThrowZod(GetCategoriesResponseSchema)(categories);
  } catch (error) {
    throw createCaseError({ message: `Failed to get categories: ${error}`, error, logger });
  }
}
