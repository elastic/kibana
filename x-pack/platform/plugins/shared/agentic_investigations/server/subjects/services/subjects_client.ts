/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type {
  InvestigationSubject,
  InvestigationSubjectInput,
  InvestigationSubjectKey,
} from '../../../common/subjects/subject';
import type { ImpactPrivilegesChecker } from '../../impact/services/check_impact_privileges';
import type { ResolveUser } from '../../services/resolve_user';
import type { ClaimSubjectsParams, ClaimSubjectsResult } from './subject_claims_service';
import type { SubjectsService } from './subjects_service';

/**
 * In-process subject reads and writes for the solution that starts investigations. The space,
 * the principal, and the acting user all come from the request.
 */
export interface SubjectsClient {
  /** Records subjects on an investigation the caller owns and attaches them by reference. */
  upsertSubjects: (
    conversationId: string,
    subjects: InvestigationSubjectInput[]
  ) => Promise<InvestigationSubject[]>;
  /** Investigations holding any of the subjects, open or closed, unchecked for access. */
  findConversationIdsBySubjects: (subjects: InvestigationSubjectKey[]) => Promise<string[]>;
  listByConversationIds: (conversationIds: string[]) => Promise<InvestigationSubject[]>;
  /** Claims every subject for a new investigation, or returns the investigation holding one. */
  claimSubjects: (params: Omit<ClaimSubjectsParams, 'spaceId'>) => Promise<ClaimSubjectsResult>;
}

export interface SubjectsClientDeps {
  getSubjectsService: () => SubjectsService;
  getSpaceId: (request: KibanaRequest) => string;
  /** Subjects share the investigations manage privilege with impact. */
  privileges: ImpactPrivilegesChecker;
  resolveUser: ResolveUser;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
}

/** Builds a request-scoped subjects client. Every call checks the privilege first. */
export const createSubjectsClient =
  ({
    getSubjectsService,
    getSpaceId,
    privileges,
    resolveUser,
    getConversationClient,
    getAttachmentClient,
  }: SubjectsClientDeps) =>
  (request: KibanaRequest): SubjectsClient => ({
    upsertSubjects: async (conversationId, subjects) => {
      await privileges.assertCanManage(request);
      const [conversations, attachments, user] = await Promise.all([
        getConversationClient(request),
        getAttachmentClient(request),
        resolveUser(request),
      ]);
      return getSubjectsService().upsertSubjects({
        conversationId,
        subjects,
        spaceId: getSpaceId(request),
        user,
        conversations,
        attachments,
      });
    },
    findConversationIdsBySubjects: async (subjects) => {
      await privileges.assertCanRead(request);
      return getSubjectsService().findConversationIdsBySubjects(subjects, getSpaceId(request));
    },
    listByConversationIds: async (conversationIds) => {
      await privileges.assertCanRead(request);
      return getSubjectsService().listByConversationIds(conversationIds, getSpaceId(request));
    },
    claimSubjects: async (params) => {
      await privileges.assertCanManage(request);
      return getSubjectsService().claimSubjects({ ...params, spaceId: getSpaceId(request) });
    },
  });
