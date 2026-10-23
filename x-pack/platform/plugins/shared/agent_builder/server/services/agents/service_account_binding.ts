/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { CoreServiceAccountsService, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ServiceAccountWorkloadDetails,
  ServiceAccountWorkloadLocator,
} from '@kbn/core-security-server';
import {
  agentBuilderDefaultAgentId,
  createBadRequestError,
  createForbiddenError,
  createInternalError,
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

/**
 * Guards a change of the service account an agent runs as.
 *
 * @param source - The stored agent on update, or the agent being created.
 * @param currentId - The account bound before the write, or `undefined` when unbound.
 * @param nextId - The account requested by the write: a string binds, `null` unbinds, `undefined`
 * keeps the current one.
 */
export const assertCanConfigureExecutionIdentity = ({
  source,
  currentId,
  nextId,
  user,
  bindings,
}: {
  source: AgentProperties;
  currentId: string | undefined;
  nextId: string | null | undefined;
  user: CurrentUser;
  bindings: ServiceAccountBindingDeps;
}): void => {
  if (nextId === undefined || nextId === (currentId ?? null)) {
    return;
  }
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

/**
 * Reference cleanups rewrite every agent that references a deleted tool, skill or plugin at once;
 * a bound agent among them needs the same privilege as any other edit of it, so the whole cleanup
 * is refused before anything is written.
 */
export const assertCanEditBoundAgentsInBulk = ({
  sources,
  canEditBoundAgents,
  action,
}: {
  sources: AgentProperties[];
  canEditBoundAgents: boolean;
  /** What the cleanup does, for the error message, e.g. "Removing tool references". */
  action: string;
}): void => {
  if (canEditBoundAgents) {
    return;
  }
  const bound = sources.filter((source) => source.service_account_id);
  if (bound.length === 0) {
    return;
  }
  const described = bound
    .map((source) => `"${source.id}" (runs as service account "${source.service_account_id}")`)
    .join(', ');
  throw createForbiddenError(
    `${action} from ${
      bound.length === 1 ? 'agent' : 'agents'
    } ${described} requires the manage_security privilege.`
  );
};

/**
 * Binds or unbinds the agent in Core before `write` persists the agent's own reference, and
 * reconciles the binding to the stored winner when the write fails. The two stores share no
 * transaction, so a failed write is compensated on a best-effort basis.
 */
export const withAgentBindingChange = async <T>({
  bindings,
  request,
  logger,
  agentId,
  spaceId,
  nextId,
  write,
  readStoredId,
}: {
  bindings: ServiceAccountBindingDeps;
  request: KibanaRequest;
  logger: Logger;
  agentId: string;
  spaceId: string;
  /** The account the write binds, or `undefined` to unbind. */
  nextId: string | undefined;
  write: () => Promise<T>;
  /** Re-reads the persisted reference, or `null` when the agent no longer exists. */
  readStoredId: () => Promise<string | undefined | null>;
}): Promise<T> => {
  const { serviceAccounts } = bindings;
  const coordinates = { workloadType: AGENT_WORKLOAD_TYPE, workloadId: agentId, spaceId };
  const previous = await serviceAccounts.getWorkloadBinding(coordinates);
  const changed = nextId !== previous?.serviceAccountId;
  let written = previous;
  if (changed) {
    if (nextId) {
      written = await serviceAccounts.bindWorkload(request, {
        workloadType: AGENT_WORKLOAD_TYPE,
        workloadId: agentId,
        serviceAccountId: nextId,
      });
    } else {
      await serviceAccounts.unbindWorkload(request, {
        workloadType: AGENT_WORKLOAD_TYPE,
        workloadId: agentId,
      });
      written = null;
    }
  }

  try {
    return await write();
  } catch (error) {
    if (!changed) {
      throw error;
    }
    try {
      const current = await serviceAccounts.getWorkloadBinding(coordinates);
      if (!isEqual(current, written)) {
        logger.error(`Binding compensation skipped after a concurrent change to agent ${agentId}.`);
        throw error;
      }
      const stored = await readStoredId();
      const targetId = stored ?? undefined;
      if (targetId && targetId !== current?.serviceAccountId) {
        await serviceAccounts.bindWorkload(request, {
          workloadType: AGENT_WORKLOAD_TYPE,
          workloadId: agentId,
          serviceAccountId: targetId,
        });
      } else if (!targetId && current) {
        await serviceAccounts.unbindWorkload(request, {
          workloadType: AGENT_WORKLOAD_TYPE,
          workloadId: agentId,
        });
      }
    } catch (compensationError) {
      if (compensationError === error) {
        throw error;
      }
      logger.error(
        `Binding compensation failed for agent ${agentId}: ${
          compensationError instanceof Error ? compensationError.message : String(compensationError)
        }`
      );
      throw createInternalError(
        'Agent write and service account binding compensation failed. Reconcile the agent binding before retrying.',
        {},
        { cause: compensationError }
      );
    }
    throw error;
  }
};

/**
 * Removes the agent's binding ahead of its deletion. Core requires `manage_security`, so a
 * caller without it is refused before anything is deleted.
 */
export const unbindAgentBeforeDelete = async ({
  bindings,
  request,
  source,
  user,
  logger,
}: {
  bindings: ServiceAccountBindingDeps;
  request: KibanaRequest;
  source: AgentProperties;
  user: CurrentUser;
  logger: Logger;
}): Promise<void> => {
  if (!source.service_account_id) {
    return;
  }
  if (!user.canManageSecurity) {
    throw createForbiddenError(
      `Deleting agent "${source.id}", which runs as service account "${source.service_account_id}", requires the manage_security privilege.`
    );
  }
  // With service accounts off there is nothing Core can unbind, and nothing can run as the
  // account either; the stored reference goes away with the document.
  if (!bindings.serviceAccounts.isEnabled()) {
    logger.warn(
      `Deleting agent ${source.id} without removing its binding to service account ${source.service_account_id}: service accounts are disabled.`
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
