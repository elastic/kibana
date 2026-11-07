/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATIONS_INTERNAL_URL,
  type Investigation,
  type InvestigationSummary,
  type ListInvestigationsResponse,
} from '../../common';
import type { CaseDecisionsResponse } from '../../common/cases_bridge';
import {
  CASE_DECISIONS_URL,
  CASE_DECISION_URL,
  type CaseDecisionsQuery,
  INVESTIGATION_LINK_CASE_URL,
  INVESTIGATION_OPEN_CASE_URL,
  type LinkCaseResponse,
  type OpenCaseRequest,
  type OpenCaseResponse,
} from '../../common/cases_bridge';
import { fetchInvestigation } from '../investigations/hooks/use_investigation';

export const openCase = (
  http: HttpStart,
  investigationId: string,
  body: OpenCaseRequest
): Promise<OpenCaseResponse> =>
  http.post<OpenCaseResponse>(
    INVESTIGATION_OPEN_CASE_URL.replace('{id}', encodeURIComponent(investigationId)),
    { version: AGENTIC_INVESTIGATIONS_API_VERSION, body: JSON.stringify(body) }
  );

export const linkCase = (
  http: HttpStart,
  investigationId: string,
  caseId: string
): Promise<LinkCaseResponse> =>
  http.post<LinkCaseResponse>(
    INVESTIGATION_LINK_CASE_URL.replace('{id}', encodeURIComponent(investigationId)),
    { version: AGENTIC_INVESTIGATIONS_API_VERSION, body: JSON.stringify({ case_id: caseId }) }
  );

/** Open investigations, newest first, for the link pickers. */
export const listOpenInvestigations = (
  http: HttpStart,
  { query, signal }: { query?: string; signal?: AbortSignal } = {}
): Promise<ListInvestigationsResponse> =>
  http.get<ListInvestigationsResponse>(INVESTIGATIONS_INTERNAL_URL, {
    version: AGENTIC_INVESTIGATIONS_API_VERSION,
    query: {
      status: 'open',
      per_page: 50,
      sort_field: 'created_at',
      sort_order: 'desc',
      ...(query ? { query } : {}),
    },
    signal,
  });

export type LinkedInvestigationResult =
  | { id: string; status: 'ok'; investigation: Investigation }
  | { id: string; status: 'inaccessible' };

/**
 * Reads each linked investigation live. A 403 or 404 means the viewer can't open it, which the
 * case shows as a count rather than as a row (its title stays hidden).
 */
export const fetchLinkedInvestigations = async (
  http: HttpStart,
  ids: string[],
  signal?: AbortSignal
): Promise<LinkedInvestigationResult[]> =>
  Promise.all(
    ids.map(async (id): Promise<LinkedInvestigationResult> => {
      try {
        return { id, status: 'ok', investigation: await fetchInvestigation(http, id, signal) };
      } catch (error) {
        const statusCode = (error as { response?: { status?: number } })?.response?.status;
        if (statusCode === 403 || statusCode === 404) {
          return { id, status: 'inaccessible' };
        }
        throw error;
      }
    })
  );

const MAX_IDS_PER_LIST_REQUEST = 100;

/**
 * Summaries of the linked investigations the viewer can read, in as few list requests as the id
 * cap allows. An id that doesn't come back is one the viewer can't open (or that was deleted).
 */
export const fetchLinkedInvestigationSummaries = async (
  http: HttpStart,
  ids: string[],
  signal?: AbortSignal
): Promise<Map<string, InvestigationSummary>> => {
  const summaries = new Map<string, InvestigationSummary>();
  for (let start = 0; start < ids.length; start += MAX_IDS_PER_LIST_REQUEST) {
    const chunk = ids.slice(start, start + MAX_IDS_PER_LIST_REQUEST);
    const { results } = await http.get<ListInvestigationsResponse>(INVESTIGATIONS_INTERNAL_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      query: { id: chunk, per_page: MAX_IDS_PER_LIST_REQUEST },
      signal,
    });
    for (const summary of results) {
      summaries.set(summary.id, summary);
    }
  }
  return summaries;
};

/** Security's case view. Bridge cases are Security cases. */
export const getCaseHref = (application: ApplicationStart, caseId: string): string =>
  application.getUrlForApp('securitySolutionUI', {
    path: `/cases/${encodeURIComponent(caseId)}`,
  });

export const formatCaseNumber = (theCase: { incremental_id?: number | null; title: string }) =>
  theCase.incremental_id != null ? `#${theCase.incremental_id}` : theCase.title;

export const fetchCaseDecisions = (
  http: HttpStart,
  caseId: string,
  query: CaseDecisionsQuery = {},
  signal?: AbortSignal
): Promise<CaseDecisionsResponse> =>
  http.get<CaseDecisionsResponse>(
    CASE_DECISIONS_URL.replace('{case_id}', encodeURIComponent(caseId)),
    {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      // Only what's set, so the server's defaults apply to the rest.
      query: Object.fromEntries(
        Object.entries(query).filter(
          (entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== ''
        )
      ),
      signal,
    }
  );

export const decideOnCase = (
  http: HttpStart,
  caseId: string,
  proposalId: string,
  decision: 'approve' | 'dismiss'
): Promise<CaseDecisionsResponse> =>
  http.post<CaseDecisionsResponse>(
    CASE_DECISION_URL.replace('{case_id}', encodeURIComponent(caseId)).replace(
      '{proposal_id}',
      encodeURIComponent(proposalId)
    ),
    { version: AGENTIC_INVESTIGATIONS_API_VERSION, body: JSON.stringify({ decision }) }
  );
