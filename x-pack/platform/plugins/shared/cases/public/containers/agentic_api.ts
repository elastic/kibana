/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesBulkGetResponse, RelatedCasesResponse } from '../../common/types/api';
import {
  INTERNAL_BULK_GET_CASES_URL,
  INTERNAL_CASE_LINKS_URL,
  INTERNAL_CASE_LINK_DETAILS_URL,
  INTERNAL_CASE_ROOM_POST_URL,
  INTERNAL_CASE_ROOM_URL,
} from '../../common/constants';
import { KibanaServices } from '../common/lib/kibana';

const withCaseId = (url: string, caseId: string) =>
  url.replace('{case_id}', encodeURIComponent(caseId));

/** Cases the viewer can't see (including restricted ones) are left out of `cases`. */
export const bulkGetCases = ({ ids }: { ids: string[] }, signal?: AbortSignal) =>
  KibanaServices.get().http.post<CasesBulkGetResponse>(INTERNAL_BULK_GET_CASES_URL, {
    body: JSON.stringify({ ids }),
    signal,
  });

export const getRelatedCases = (caseId: string, signal?: AbortSignal) =>
  KibanaServices.get().http.get<RelatedCasesResponse>(withCaseId(INTERNAL_CASE_LINKS_URL, caseId), {
    signal,
  });

export const linkCases = (caseId: string, targetCaseIds: string[]) =>
  KibanaServices.get().http.post<RelatedCasesResponse>(
    withCaseId(INTERNAL_CASE_LINKS_URL, caseId),
    {
      body: JSON.stringify({ target_case_ids: targetCaseIds }),
    }
  );

export const unlinkCase = (caseId: string, targetCaseId: string) =>
  KibanaServices.get().http.delete<RelatedCasesResponse>(
    withCaseId(INTERNAL_CASE_LINK_DETAILS_URL, caseId).replace(
      '{target_case_id}',
      encodeURIComponent(targetCaseId)
    )
  );

export const ensureCaseRoom = (caseId: string) =>
  KibanaServices.get().http.post<{ conversation_id: string; created: boolean }>(
    withCaseId(INTERNAL_CASE_ROOM_URL, caseId)
  );

export const postFromRoom = (caseId: string, eventId: string) =>
  KibanaServices.get().http.post(withCaseId(INTERNAL_CASE_ROOM_POST_URL, caseId), {
    body: JSON.stringify({ event_id: eventId }),
  });
