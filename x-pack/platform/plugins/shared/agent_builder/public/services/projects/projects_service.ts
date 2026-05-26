/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { Project, ProjectType } from '@kbn/agent-builder-common';
import type {
  CreateProjectFromCaseBody,
  GetProjectResponse,
  ListProjectsQuery,
  ListProjectsResponse,
} from '../../../common/http_api/projects';
import { publicApiPath } from '../../../common/constants';

export class ProjectsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list(query?: ListProjectsQuery): Promise<Project[]> {
    const res = await this.http.get<ListProjectsResponse>(`${publicApiPath}/projects`, {
      query,
    });
    return res.results;
  }

  async get(projectId: string): Promise<GetProjectResponse> {
    return await this.http.get<GetProjectResponse>(`${publicApiPath}/projects/${projectId}`);
  }

  async getOrCreateForCase(body: CreateProjectFromCaseBody): Promise<Project> {
    const res = await this.http.post<GetProjectResponse>(`${publicApiPath}/projects/from_case`, {
      body: JSON.stringify(body),
    });
    return res.project;
  }

  async listByType(type: ProjectType): Promise<Project[]> {
    return this.list({ type });
  }
}
