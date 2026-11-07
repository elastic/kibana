/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type {
  CreateInvestigationStepInput,
  PatchInvestigationStepInput,
} from '../../../common/investigations/step_types';
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
import type { CaseActionSource, WorkerCaseService } from '../../cases_bridge/worker_case_service';

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
  /**
   * The one writer of new investigations (Worker steps, Hunt). Creates the conversation from the
   * investigation template with the caller's Agent Builder access, as `ai.conversation.create`
   * does. With `agenticInvestigations:openCasesForInvestigations` on, it also opens the
   * investigation's case; a failed case open is logged and never fails the create.
   */
  create: (
    params: CreateInvestigationStepInput,
    options?: InvestigationWriteOptions
  ) => Promise<CreatedInvestigation>;
  /**
   * Changes investigation fields, as `ai.conversation.metadata.patch` does. With the setting on,
   * verdict and summary, severity, and status follow onto the investigation's own case.
   */
  patchMetadata: (
    params: PatchInvestigationStepInput,
    options?: InvestigationWriteOptions
  ) => Promise<PatchedInvestigation>;
}

export interface InvestigationWriteOptions {
  /** `workflow` from a workflow step, so `ai.conversation.updated` records the same source. */
  source?: 'server_api' | 'workflow';
  /** Who the case records as the actor when a write opens or changes it (the Worker). */
  actionSource?: CaseActionSource;
}

export interface CreatedInvestigation {
  conversation_id: string;
  agent_id: string;
  template_id?: string;
  metadata: Record<string, unknown>;
  case_id?: string;
}

export interface PatchedInvestigation {
  conversation_id: string;
  changed_fields: string[];
  metadata: Record<string, unknown>;
}

const INVESTIGATION_TEMPLATE_ID = 'investigation';

export interface InvestigationsClientDeps {
  getQueryService: () => InvestigationsQueryService;
  getSpaceId: (request: KibanaRequest) => string;
  privileges: InvestigationsPrivilegesChecker;
  deleteAllInSpace: (spaceId: string) => Promise<DeleteInvestigationDataResult>;
  getConversationClient: (
    request: KibanaRequest,
    source?: 'server_api' | 'workflow'
  ) => Promise<ConversationPublicClient>;
  /** Present when the Cases bridge is on. */
  getWorkerCases?: () => WorkerCaseService | undefined;
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
  ({
    getQueryService,
    getSpaceId,
    privileges,
    deleteAllInSpace,
    getConversationClient,
    getWorkerCases,
  }: InvestigationsClientDeps) =>
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
    // No investigations privilege check here: like the Agent Builder steps these replace, the
    // conversation write is authorized by Agent Builder, so a Worker that could write before can.
    create: async (params, options = {}) => {
      const conversations = await getConversationClient(request, options.source);
      const conversation = await conversations.create({
        agentId: params.agent_id,
        id: params.conversation_id,
        title: params.title,
        accessControl: params.access_control,
        templateId: INVESTIGATION_TEMPLATE_ID,
        metadata: params.metadata,
      });
      const caseId = await getWorkerCases?.()?.onInvestigationCreated(
        request,
        conversation,
        options.actionSource
      );
      return {
        conversation_id: conversation.id,
        agent_id: conversation.agent_id,
        ...(conversation.template_id ? { template_id: conversation.template_id } : {}),
        metadata: { ...(conversation.metadata ?? {}), ...(caseId ? { case_id: caseId } : {}) },
        ...(caseId ? { case_id: caseId } : {}),
      };
    },
    patchMetadata: async ({ conversation_id: conversationId, updates }, options = {}) => {
      const conversations = await getConversationClient(request, options.source);
      const { conversation, changedFields } = await conversations.patchMetadata(
        conversationId,
        updates
      );
      if (changedFields.length > 0) {
        await getWorkerCases?.()?.onInvestigationPatched(
          request,
          conversation,
          changedFields,
          options.actionSource
        );
      }
      return {
        conversation_id: conversationId,
        changed_fields: changedFields,
        metadata: (conversation.metadata ?? {}) as Record<string, unknown>,
      };
    },
  });
