/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

/** The version of the public Workflows API this plugin is written against. */
const API_VERSION = '2023-10-31';

/** What a person needs to know of a workflow to decide whether to run it. */
export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  valid: boolean;
  /** What the workflow does. Only the part a person is shown of it is typed here. */
  definition?: {
    steps?: ReadonlyArray<{ name?: string; type?: string; [key: string]: unknown }>;
  } | null;
}

export interface WorkflowList {
  results: WorkflowSummary[];
  total: number;
}

/** What is sent along with a run, so that it can be traced to the app and the button. */
export interface WorkflowRunMetadata {
  source: 'custom_app';
  nodeId: string;
  appId?: string;
}

const path = (id: string) => `/api/workflows/workflow/${encodeURIComponent(id)}`;

/**
 * The Workflows API, called with the session of the person using the app. Nothing here gives a
 * run more than their own privileges: the routes check them, and the run is theirs.
 */
export const createWorkflowClient = (http: HttpStart) => ({
  get: (id: string) => http.get<WorkflowSummary>(path(id), { version: API_VERSION }),

  /** How a run is going, to know when it is over. */
  execution: (id: string) =>
    http.get<{ status: string }>(`/api/workflows/executions/${encodeURIComponent(id)}`, {
      version: API_VERSION,
    }),

  list: ({ query, size }: { query?: string; size: number }) =>
    http.get<WorkflowList>('/api/workflows', {
      version: API_VERSION,
      query: { size, ...(query ? { query } : {}) },
    }),

  run: (
    id: string,
    { inputs, metadata }: { inputs: Record<string, unknown>; metadata: WorkflowRunMetadata }
  ) =>
    http.post<{ workflowExecutionId: string }>(`${path(id)}/run`, {
      version: API_VERSION,
      body: JSON.stringify({ inputs, metadata }),
    }),
});

export type WorkflowClient = ReturnType<typeof createWorkflowClient>;
