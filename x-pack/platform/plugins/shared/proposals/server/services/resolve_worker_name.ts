/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type ResolveWorkerName = (params: {
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
}) => Promise<string | undefined>;

/** The workflow that started the chain of runs `context.executionChain` records, root first. */
const readRootWorkflowId = (context: Record<string, unknown> | undefined): string | undefined => {
  const chain = context?.executionChain;
  if (!Array.isArray(chain)) {
    return undefined;
  }
  const [root]: unknown[] = chain;
  if (typeof root !== 'object' || root === null || !('workflowId' in root)) {
    return undefined;
  }
  return typeof root.workflowId === 'string' ? root.workflowId : undefined;
};

/**
 * TODO: temporary. Service accounts have no `full_name`, so a Worker's decisions and proposals
 * would show its raw account id. Names the Worker instead, by the workflow at the root of the
 * running execution. Remove once service accounts carry a real `full_name`.
 *
 * Only a service account is named, so a person who resumes a gate keeps their own name. Resolves
 * to `undefined` rather than failing, so attribution falls back to the raw username.
 */
export const createWorkerNameResolver =
  ({
    security,
    getWorkflowsApi,
    logger,
  }: Pick<CoreStart, 'security'> & {
    getWorkflowsApi: () => WorkflowsServerPluginSetup['management'];
    logger: Logger;
  }): ResolveWorkerName =>
  async ({ executionId, spaceId, request }) => {
    try {
      if (security.authc.getPrincipal(request)?.type !== 'service_account') {
        return undefined;
      }
      const workflowsApi = getWorkflowsApi();
      const execution = await workflowsApi.getWorkflowExecution(executionId, spaceId, {
        request,
        omitStepExecutions: true,
      });
      const rootWorkflowId = readRootWorkflowId(execution?.context);
      if (!rootWorkflowId) {
        return undefined;
      }
      const rootWorkflow = await workflowsApi.getWorkflow(rootWorkflowId, spaceId, request);
      return rootWorkflow?.name || undefined;
    } catch (error) {
      logger.debug(
        `Failed to resolve the Worker name, falling back to the username: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  };
