/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** UI-layer convention for runbook artifact `data`. Not enforced by the framework. */
export interface RunbookArtifactData {
  content: string;
}

/** UI-layer convention for dashboard artifact `data`. Not enforced by the framework. */
export interface DashboardArtifactData {
  dashboardId: string;
}

export const getRunbookContent = (artifact: { data: Record<string, unknown> }): string =>
  typeof artifact.data.content === 'string' ? artifact.data.content : '';

export const getDashboardId = (artifact: { data: Record<string, unknown> }): string | undefined =>
  typeof artifact.data.dashboardId === 'string' ? artifact.data.dashboardId : undefined;
