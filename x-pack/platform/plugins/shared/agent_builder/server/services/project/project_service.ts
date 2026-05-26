/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SecurityServiceStart,
  ElasticsearchServiceStart,
} from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import { ProjectType, type Project, type ProjectCreateRequest } from '@kbn/agent-builder-common';
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { ProjectClient } from './client';
import { createProjectClient } from './client';
import { projectCaseKnowledgeProjection } from './knowledge_projection';

export interface ProjectService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ProjectClient>;
  getOrCreateForCase(options: {
    request: KibanaRequest;
    caseId: string;
    owner: string;
    title?: string;
  }): Promise<Project>;
  getKnowledgeSummary(options: {
    request: KibanaRequest;
    project: Project;
  }): Promise<ReturnType<typeof projectCaseKnowledgeProjection>>;
}

interface ProjectServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  getCasesClientWithRequest?: (request: KibanaRequest) => Promise<CasesClient>;
}

export class ProjectServiceImpl implements ProjectService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly getCasesClientWithRequest?: ProjectServiceDeps['getCasesClientWithRequest'];

  constructor(deps: ProjectServiceDeps) {
    this.logger = deps.logger;
    this.security = deps.security;
    this.elasticsearch = deps.elasticsearch;
    this.spaces = deps.spaces;
    this.getCasesClientWithRequest = deps.getCasesClientWithRequest;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ProjectClient> {
    const scopedClient = this.elasticsearch.client.asScoped(request);
    const user = await getUserFromRequest({
      request,
      security: this.security,
      esClient: scopedClient.asCurrentUser,
    });
    const esClient = scopedClient.asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createProjectClient({ user, esClient, logger: this.logger, space });
  }

  async getOrCreateForCase({
    request,
    caseId,
    owner,
    title,
  }: {
    request: KibanaRequest;
    caseId: string;
    owner: string;
    title?: string;
  }): Promise<Project> {
    const client = await this.getScopedClient({ request });
    const existing = await client.findByCaseRef(caseId, owner);
    if (existing) {
      return existing;
    }

    const members = await this.resolveCaseAssigneeMembers({ request, caseId, owner });

    const createRequest: ProjectCreateRequest = {
      title: title ?? `Case ${caseId}`,
      type: ProjectType.case,
      case_ref: { case_id: caseId, owner },
      members,
    };

    return client.create(createRequest);
  }

  async getKnowledgeSummary({
    request,
    project,
  }: {
    request: KibanaRequest;
    project: Project;
  }) {
    if (!this.getCasesClientWithRequest) {
      return undefined;
    }
    const casesClient = await this.getCasesClientWithRequest(request);
    return projectCaseKnowledgeProjection({
      project,
      casesClient,
      logger: this.logger,
    });
  }

  private async resolveCaseAssigneeMembers({
    request,
    caseId,
    owner,
  }: {
    request: KibanaRequest;
    caseId: string;
    owner: string;
  }): Promise<string[]> {
    if (!this.getCasesClientWithRequest) {
      return [];
    }
    try {
      const casesClient = await this.getCasesClientWithRequest(request);
      const caseInfo = await casesClient.cases.get({ id: caseId });
      return (caseInfo.assignees ?? []).map((assignee) => assignee.uid);
    } catch {
      return [];
    }
  }
}
