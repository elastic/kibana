/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalUser } from '@kbn/proposals-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type ResolveWorkerUser = (params: {
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
}) => Promise<ProposalUser | undefined>;

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
 * would show its raw account id, or nobody at all. Names the Worker instead, by the workflow at
 * the root of the running execution. Remove once service accounts carry a real `full_name`.
 *
 * Resolves only for a service account, so a person who resumes a gate keeps their own name. The
 * account's request carries no stored user, so `getCurrentUser` and the profile service resolve
 * nothing for it: the principal is the only source of its id. A failed name lookup leaves the
 * account id as the username.
 */
export const createWorkerUserResolver =
  ({
    security,
    getWorkflowsApi,
    logger,
  }: Pick<CoreStart, 'security'> & {
    getWorkflowsApi: () => WorkflowsServerPluginSetup['management'];
    logger: Logger;
  }): ResolveWorkerUser =>
  async ({ executionId, spaceId, request }) => {
    const principal = security.authc.getPrincipal(request);
    if (principal?.type !== 'service_account') {
      return undefined;
    }

    const findWorkerName = async (): Promise<string | undefined> => {
      try {
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
          `Failed to resolve the Worker name, falling back to the account id: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return undefined;
      }
    };

    const workerName = await findWorkerName();
    return {
      username: principal.serviceAccountId,
      fullName: workerName
        ? i18n.translate('xpack.proposals.workerUser.fullName', {
            defaultMessage: '{workerName} worker',
            values: { workerName },
          })
        : null,
      email: null,
    };
  };
