/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  OSQUERY_MAX_AGENTS_HEADER,
  OSQUERY_DISPATCH_SOURCE_HEADER,
  OSQUERY_DISPATCH_WORKFLOW_ID_HEADER,
  OSQUERY_DISPATCH_EXECUTION_ID_HEADER,
} from '../../../common/constants';
import { TARGET_AGENT_LIMIT } from '../../../common/workflows/contract/budget';

export const PUBLIC_API_HEADERS = { 'elastic-api-version': API_VERSIONS.public.v1 };
export const INTERNAL_API_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };

export interface WorkflowDispatchIds {
  workflowId: string;
  executionId: string;
}

/** Adds the agent ceiling and caller-asserted workflow trace metadata to dispatch requests. */
export const getDispatchApiHeaders = ({
  workflowId,
  executionId,
}: WorkflowDispatchIds): Record<string, string> => ({
  ...PUBLIC_API_HEADERS,
  [OSQUERY_MAX_AGENTS_HEADER]: String(TARGET_AGENT_LIMIT),
  [OSQUERY_DISPATCH_SOURCE_HEADER]: 'workflow',
  [OSQUERY_DISPATCH_WORKFLOW_ID_HEADER]: workflowId,
  [OSQUERY_DISPATCH_EXECUTION_ID_HEADER]: executionId,
});
