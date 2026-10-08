/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  investigationFiltersSchema,
  listInvestigationsQuerySchema,
  type Investigation,
  type InvestigationFiltersInput,
  type InvestigationSeverityCounts,
  type InvestigationSummary,
  type ListInvestigationsQueryInput,
  type ListInvestigationsResponse,
} from '../../../common/investigations/investigation';
import { MAX_SUBJECTS_PER_REQUEST } from '../../../common/subjects/constants';
import {
  investigationSubjectKeySchema,
  type InvestigationSubjectKey,
} from '../../../common/subjects/subject';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments';
import type { InvestigationsPrivilegesChecker } from './check_investigations_privileges';
import type { InvestigationsQueryService } from './investigations_query_service';

/** Side-index documents a maintenance delete removed, per index. */
export interface DeleteInvestigationDataResult {
  subjects: number;
  subjectClaims: number;
  impact: number;
  hypotheses: number;
}

/**
 * In-process investigation reads for solution plugins. The space and the principal come from the
 * request: reads need the investigations read or manage privilege, and the maintenance delete
 * needs manage. Conversations are read as the caller, so access control matches the HTTP API.
 */
export interface InvestigationsClient {
  get: (id: string) => Promise<Investigation>;
  list: (query?: ListInvestigationsQueryInput) => Promise<ListInvestigationsResponse>;
  severityCounts: (filters?: InvestigationFiltersInput) => Promise<InvestigationSeverityCounts>;
  /** Open investigations holding any of the subjects, most recently updated first. */
  findOpenBySubjects: (subjects: InvestigationSubjectKey[]) => Promise<InvestigationSummary[]>;
  /**
   * Maintenance: removes every subject, subject claim, impact, and hypotheses document in the
   * request's space. Conversations belong to Agent Builder and are left alone.
   */
  deleteAllInSpace: () => Promise<DeleteInvestigationDataResult>;
}

export interface InvestigationsClientDeps {
  getQueryService: () => InvestigationsQueryService;
  getSpaceId: (request: KibanaRequest) => string;
  privileges: InvestigationsPrivilegesChecker;
  deleteAllInSpace: (spaceId: string) => Promise<DeleteInvestigationDataResult>;
}

const subjectKeysSchema = investigationSubjectKeySchema.array().max(MAX_SUBJECTS_PER_REQUEST);

const parseOrThrow = <T>(
  result: { success: true; data: T } | { success: false; error: { message: string } }
): T => {
  if (!result.success) {
    throw new InvestigationAttachmentInvalidRequestError(result.error.message);
  }
  return result.data;
};

/** Builds a request-scoped investigations client. Every call checks the privilege first. */
export const createInvestigationsClient =
  ({ getQueryService, getSpaceId, privileges, deleteAllInSpace }: InvestigationsClientDeps) =>
  (request: KibanaRequest): InvestigationsClient => ({
    get: async (id) => {
      await privileges.assertCanRead(request);
      return getQueryService().get(request, id);
    },
    list: async (query = {}) => {
      await privileges.assertCanRead(request);
      return getQueryService().list(
        request,
        parseOrThrow(listInvestigationsQuerySchema.safeParse(query))
      );
    },
    severityCounts: async (filters = {}) => {
      await privileges.assertCanRead(request);
      return getQueryService().severityCounts(
        request,
        parseOrThrow(investigationFiltersSchema.safeParse(filters))
      );
    },
    findOpenBySubjects: async (subjects) => {
      await privileges.assertCanRead(request);
      return getQueryService().findOpenBySubjects(
        request,
        parseOrThrow(subjectKeysSchema.safeParse(subjects))
      );
    },
    deleteAllInSpace: async () => {
      await privileges.assertCanManage(request);
      return deleteAllInSpace(getSpaceId(request));
    },
  });
