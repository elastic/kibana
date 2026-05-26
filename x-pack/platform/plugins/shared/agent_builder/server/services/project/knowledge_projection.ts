/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CasesClient } from '@kbn/cases-plugin/server';
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

/**
 * Projects case metadata into a lightweight knowledge summary for Agent Builder projects.
 */
export const projectCaseKnowledgeProjection = async ({
  project,
  casesClient,
  logger,
}: {
  project: Project;
  casesClient: CasesClient;
  logger: Logger;
}): Promise<ProjectKnowledgeSummary | undefined> => {
  if (!project.case_ref) {
    return undefined;
  }

  try {
    const caseInfo = await casesClient.cases.get({
      id: project.case_ref.case_id,
    });

    return {
      case_id: project.case_ref.case_id,
      owner: project.case_ref.owner,
      title: caseInfo.title,
      description: caseInfo.description,
      status: caseInfo.status,
      severity: caseInfo.severity,
      total_alerts: caseInfo.totalAlerts,
      total_comments: caseInfo.totalComment,
    };
  } catch (error) {
    logger.warn(`Failed to project case knowledge for project ${project.id}: ${error}`);
    return undefined;
  }
};
