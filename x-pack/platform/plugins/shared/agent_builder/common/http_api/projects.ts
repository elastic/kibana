/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Project } from '@kbn/agent-builder-common';

export interface ProjectKnowledgeSummary {
  case_id: string;
  owner: string;
  title?: string;
  description?: string;
  status?: string;
  severity?: string;
  total_alerts?: number;
  total_comments?: number;
}

export interface ListProjectsResponse {
  results: Project[];
}

export interface GetProjectResponse {
  project: Project;
  knowledge?: ProjectKnowledgeSummary;
}

export interface ListProjectsQuery {
  type?: string;
  case_id?: string;
}

export interface CreateProjectFromCaseBody {
  case_id: string;
  owner: string;
  title?: string;
}
