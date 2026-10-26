/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { type IKibanaResponse } from '@kbn/core/server';
import pLimit from 'p-limit';
import { createCasesRoute } from '../create_cases_route';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL,
  SECURITY_ENTITY_ATTACHMENT_TYPE,
} from '../../../../common/constants';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { type CasesClient } from '../../../client';
import { type caseApiV1 } from '../../../../common/types/api';
import { buildFilter, combineFilters } from '../../../client/utils';

// cases modal shows 10 cases by default
const MAX_CONCURRENT_CASES = 10;

export const findCasesContainingAllDocumentsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      documentIds: schema.maybe(schema.arrayOf(schema.string())),
      caseIds: schema.arrayOf(schema.string()),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({
    context,
    request,
    response,
  }): Promise<IKibanaResponse<{ casesWithAllAttachments: string[] }>> => {
    const { documentIds, caseIds } =
      request.body as caseApiV1.FindCasesContainingAllDocumentsRequest;

    if (!caseIds.length || !documentIds?.length) {
      return response.ok({
        body: { casesWithAllAttachments: [] },
      });
    }

    const caseIdsToCheck = Array.isArray(caseIds) ? caseIds : [caseIds];

    const documentIdSet = new Set(documentIds);
    const casesContext = await context.cases;
    const casesClient = await casesContext.getCasesClient();

    const limit = pLimit(MAX_CONCURRENT_CASES);

    const results: Array<string | null> = await Promise.all(
      caseIdsToCheck.map((caseId) => {
        return limit(async () => processCase(casesClient, caseId, documentIdSet));
      })
    );

    return response.ok({
      body: {
        casesWithAllAttachments: results.filter((id): id is string => id !== null),
      },
    });
  },
});

export const isStringOrArray = (value: unknown): value is string | string[] => {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
};

export const processCase = async (
  casesClient: CasesClient,
  caseId: string,
  documentIds: Set<string>
) => {
  const documentIdList = Array.from(documentIds);

  /**
   * Legacy attachments live in `cases-comments` and store the document id in either
   * `eventId` or `alertId`, so we OR-match those two fields.
   */
  const legacyFilter = combineFilters(
    [
      buildFilter({
        filters: documentIdList,
        field: 'eventId',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
      buildFilter({
        filters: documentIdList,
        field: 'alertId',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
    ],
    'or' as const
  );

  /**
   * Unified attachments live in `cases-attachments` and store the document id in
   * `attachmentId`.
   */
  const unifiedFilter = buildFilter({
    filters: documentIdList,
    field: 'attachmentId',
    operator: 'or',
    type: CASE_ATTACHMENT_SAVED_OBJECT,
  });

  const documentsForCase = await casesClient.attachments.getAllDocumentsAttachedToCase({
    caseId,
    filter: combineFilters([legacyFilter, unifiedFilter], 'or' as const),
    // Entity attachments aren't alerts/events, so include their unified type explicitly
    // or the getter's default alert/event type filter would exclude them.
    unifiedAttachmentTypes: [SECURITY_ENTITY_ATTACHMENT_TYPE],
  });

  // Combine document ids from cases-comments and cases-attachments for deduplication
  const returnedDocumentIds = new Set(documentsForCase.map((document) => document.id));
  for (const requestedId of documentIds) {
    if (!returnedDocumentIds.has(requestedId)) {
      return null;
    }
  }
  return caseId;
};
