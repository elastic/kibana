/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreServiceAccountsService, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ServiceAccountWorkloadDetails,
  ServiceAccountWorkloadLocator,
} from '@kbn/core-security-server';
import {
  agentBuilderDefaultAgentId,
  createBadRequestError,
  createForbiddenError,
  type CurrentUser,
} from '@kbn/agent-builder-common';
import { AGENTBUILDER_PATH } from '../../../common/features';
import { createSpaceDslFilter } from '../../utils/spaces';
import { hasConfigureExecutionIdentityAccess, hasEditBoundAgentAccess } from './access_control';
import type { AgentProfileStorage, AgentProperties } from './persisted/client/storage';

/** Workload type Agent Builder registers with Core's service account bindings. */
export const AGENT_WORKLOAD_TYPE = 'agent';

export interface ServiceAccountBindingDeps {
  serviceAccounts: CoreServiceAccountsService;
}

/** Guards binding, replacing or removing the service account an agent runs as. */
export const assertCanConfigureExecutionIdentity = ({
  source,
  user,
  bindings,
}: {
  source: AgentProperties;
  user: CurrentUser;
  bindings: ServiceAccountBindingDeps;
}): void => {
  if (!bindings.serviceAccounts.isEnabled()) {
    throw createBadRequestError('Service accounts are not enabled on this Kibana.');
  }
  if (hasConfigureExecutionIdentityAccess({ source, user })) {
    return;
  }
  throw createForbiddenError(
    source.id === agentBuilderDefaultAgentId
      ? `The default agent (${agentBuilderDefaultAgentId}) cannot run as a service account.`
      : 'Only agent editors with the manage_security privilege can change the service account an agent runs as.'
  );
};

/**
 * Every edit of a bound agent directs its service account, so editing one needs the same
 * privilege as the binding.
 */
export const assertCanEditBoundAgent = ({
  source,
  user,
}: {
  source: AgentProperties;
  user: CurrentUser;
}): void => {
  if (hasEditBoundAgentAccess({ source, user })) {
    return;
  }
  throw createForbiddenError(
    `Editing agent "${source.id}", which runs as service account "${source.service_account_id}", requires the manage_security privilege.`
  );
};

/** Deleting a bound agent removes its binding, which Core only allows with `manage_security`. */
export const assertCanDeleteBoundAgent = ({
  source,
  user,
}: {
  source: AgentProperties;
  user: CurrentUser;
}): void => {
  if (!source.service_account_id || user.canManageSecurity) {
    return;
  }
  throw createForbiddenError(
    `Deleting agent "${source.id}", which runs as service account "${source.service_account_id}", requires the manage_security privilege.`
  );
};

/**
 * Removes the binding of an agent whose document is already deleted. Running after the delete
 * means a failed delete leaves both stores untouched, and a failed unbind leaves only an orphan
 * binding that nothing can run under.
 */
export const unbindDeletedAgent = async ({
  bindings,
  request,
  source,
  logger,
}: {
  bindings: ServiceAccountBindingDeps;
  request: KibanaRequest;
  source: AgentProperties;
  logger: Logger;
}): Promise<void> => {
  if (!source.service_account_id) {
    return;
  }
  // With service accounts off there is nothing Core can unbind, and nothing can run as the
  // account either; the stored reference went away with the document.
  if (!bindings.serviceAccounts.isEnabled()) {
    logger.warn(
      `Deleted agent ${source.id} without removing its binding to service account ${source.service_account_id}: service accounts are disabled.`
    );
    return;
  }
  await bindings.serviceAccounts.unbindWorkload(request, {
    workloadType: AGENT_WORKLOAD_TYPE,
    workloadId: source.id,
  });
};

/** Lets the service account management page show the bound agents' names and pages. */
export const resolveAgentWorkloads = async ({
  storage,
  workloads,
}: {
  storage: AgentProfileStorage;
  workloads: ReadonlyArray<ServiceAccountWorkloadLocator>;
}): Promise<Array<ServiceAccountWorkloadDetails | undefined>> => {
  if (workloads.length === 0) {
    return [];
  }
  const response = await storage.getClient().search({
    track_total_hits: false,
    size: workloads.length,
    _source: ['id', 'name', 'space'],
    query: {
      bool: {
        should: workloads.map(({ workloadId, spaceId }) => ({
          bool: {
            filter: [createSpaceDslFilter(spaceId), { term: { id: workloadId } }],
          },
        })),
        minimum_should_match: 1,
      },
    },
  });
  const byKey = new Map<string, ServiceAccountWorkloadDetails>();
  for (const hit of response.hits.hits) {
    const source = hit._source;
    if (source?.id && source.space) {
      byKey.set(`${source.space}:${source.id}`, {
        title: source.name,
        path: `${AGENTBUILDER_PATH}/agents/${encodeURIComponent(source.id)}/overview`,
      });
    }
  }
  return workloads.map(({ workloadId, spaceId }) => byKey.get(`${spaceId}:${workloadId}`));
};
