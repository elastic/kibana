/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { v4 as uuidv4 } from 'uuid';
import { errors as EsErrors } from '@elastic/elasticsearch';

import { appContextService } from '../app_context';
import type { Agent } from '../../types';
import {
  AgentlessAgentRestrictionError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';
import { AgentRollbackError } from '../../errors';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';
import { createErrorActionResults, createAgentAction } from './actions';
import { bulkUpdateAgents } from './crud';
import {
  EXPIRED_ROLLBACK_ERROR_MESSAGE,
  getValidRollbacks,
  NO_ROLLBACK_ERROR_MESSAGE,
} from './rollback';

export class RollbackActionRunner extends ActionRunner {
  private allActionIds: string[] = [];

  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    const result = await rollbackBatch(
      this.esClient,
      agents,
      {},
      {
        // Don't pass actionId - each version group should get its own unique ID
        // actionId is for tracking the bulk operation task, not individual rollback actions
        // Don't pass total - each action should use the count for its version group, not the total across all batches
        spaceIds: this.actionParams?.spaceId ? [this.actionParams.spaceId] : undefined,
        // Those per-version ids are derived from this action's id so that they carry the link back
        // to it. Nothing else does: rollback writes no document under the action's own id, so
        // without this a resumed run has no way to find what an earlier one already dispatched,
        // and re-sends a rollback to every agent it handled.
        childActionIdPrefix: this.getChildActionIdPrefix(),
      },
      this.actionParams?.spaceId ? [this.actionParams.spaceId] : undefined
    );
    // Track all action IDs created across batches
    this.allActionIds.push(...result.actionIds);
    // Return the first actionId for compatibility with ActionRunner interface
    // If no actions were created, return empty string
    return {
      actionId: result.actionIds.length > 0 ? result.actionIds[0] : '',
    };
  }

  protected getChildActionIdPrefix(): string | undefined {
    const actionId = this.actionParams?.actionId;
    return actionId ? `${actionId}${CHILD_ACTION_ID_SEPARATOR}` : undefined;
  }

  /**
   * Rollback rejects agents — hosted, agentless, expired or without a rollback to make — by
   * writing them an error result under a child action id while leaving them out of that action's
   * `agents`, so the action documents alone do not show that they were dealt with.
   */
  protected hasAgentsHandledOutsideActionDocuments(): boolean {
    return true;
  }

  async processAgentsInBatches(): Promise<{ actionId: string }> {
    // Reset action IDs tracking for this batch processing run
    this.allActionIds = [];
    const result = await super.processAgentsInBatches();
    // Store all collected action IDs in actionParams for retrieval
    if (this.allActionIds.length > 0) {
      this.actionParams.allActionIds = this.allActionIds;
    }
    return result;
  }

  public getAllActionIds(): string[] {
    return this.allActionIds;
  }

  protected getTaskType() {
    return BulkActionTaskType.ROLLBACK_RETRY;
  }

  protected getActionType() {
    return 'UPGRADE';
  }
}

/**
 * Separates a rollback action's own id from the id of the action that created it. `.fleet-actions`
 * already holds composite action ids — scheduled unenroll prefixes its own and reads them back
 * with the same kind of prefix query — so this is an established shape for the index.
 */
export const CHILD_ACTION_ID_SEPARATOR = '-rollback-';

const createChildActionId = (childActionIdPrefix?: string) =>
  `${childActionIdPrefix ?? ''}${uuidv4()}`;

/**
 * Statuses that mean Elasticsearch itself refused the write, so nothing can have been indexed.
 *
 * Deliberately an allowlist. Nothing else is safe to read as a definite rejection: a 502 or 504
 * from a proxy in front of Elasticsearch — routine on Cloud, and more likely with the
 * `refresh: 'wait_for'` these writes use — arrives as an ordinary response error long after the
 * document may have been indexed, and a 409 on a `create` means the opposite of a rejection, the
 * document being already there from an attempt that did land. Nor is a transport failure
 * enumerable: timeouts, dropped connections, aborted requests and bodies that would not parse all
 * leave the question open, and listing them is a list that can only ever be incomplete. Anything
 * missing from this list is therefore treated as "it may have been written".
 */
const DEFINITE_REJECTION_STATUS_CODES = [
  400, // bad request, including a mapping failure
  403, // forbidden
  404, // no such index
  429, // rejected, the write queue being full
];

const isDefiniteRejection = (error: Error): boolean =>
  error instanceof EsErrors.ResponseError &&
  DEFINITE_REJECTION_STATUS_CODES.includes(error.statusCode!);

/**
 * Put back the upgrade fields `rollbackBatch` cleared, from the agent documents it read before
 * clearing them, for when the action those agents were marked for never made it to Elasticsearch.
 */
const restoreUpgradeState = async (
  esClient: ElasticsearchClient,
  actionId: string,
  agents: Agent[]
) => {
  // bulkUpdateAgents reports per agent failures in this map rather than throwing, so a restore
  // that only partly landed would otherwise be silent.
  const errors: Record<Agent['id'], Error> = {};
  await bulkUpdateAgents(
    esClient,
    agents.map((agent) => ({
      agentId: agent.id,
      data: {
        upgraded_at: agent.upgraded_at ?? null,
        upgrade_started_at: agent.upgrade_started_at ?? null,
      },
    })),
    errors
  );
  const failedAgentIds = Object.keys(errors);
  if (failedAgentIds.length > 0) {
    appContextService
      .getLogger()
      .warn(
        `Could not restore the upgrade state of ${
          failedAgentIds.length
        } agents after rollback action ${actionId} failed to be created: ${failedAgentIds.join(
          ', '
        )}`
      );
  }
};

export async function rollbackBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: {
    actionId?: string;
    total?: number;
    spaceIds?: string[];
    /** Prefix that links each generated action id back to the action that created it. */
    childActionIdPrefix?: string;
  },
  spaceIds?: string[]
): Promise<{ actionIds: string[] }> {
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceIds?.[0]);

  const restrictions = await getAgentPolicyRestrictions(soClient, givenAgents);

  // Eligible agents, grouped by rollback version
  const agentsByRollbackVersion: Record<string, Agent[]> = {};

  // Pre-action errors are not linked to a specific rollback version:
  // - agent not found
  // - agent exists but has no available rollback
  const preActionErrors: Record<Agent['id'], Error> = { ...outgoingErrors };
  // Version-specific errors are linked to a specific rollback version:
  // - expired rollback
  // - hosted agent
  const errorsByRollbackVersion: Record<string, Record<Agent['id'], Error>> = {};

  for (const agent of givenAgents) {
    const rollbacks = agent.upgrade?.rollbacks || [];

    // If agent has no available rollbacks, add to pre-action errors
    if (rollbacks.length === 0) {
      preActionErrors[agent.id] = new AgentRollbackError(NO_ROLLBACK_ERROR_MESSAGE);
      continue;
    }

    const rollbackVersion = rollbacks[0].version;

    // If agent has expired rollback, add to version-specific errors
    const validRollbacks = getValidRollbacks(agent);
    if (validRollbacks.length === 0) {
      if (!errorsByRollbackVersion[rollbackVersion]) {
        errorsByRollbackVersion[rollbackVersion] = {};
      }
      errorsByRollbackVersion[rollbackVersion][agent.id] = new AgentRollbackError(
        EXPIRED_ROLLBACK_ERROR_MESSAGE
      );
      continue;
    }

    // If agent is hosted or agentless, add to version-specific errors
    const restrictionError = isHostedAgent(restrictions, agent)
      ? new HostedAgentPolicyRestrictionRelatedError(
          `Cannot rollback agent in hosted agent policy ${agent.policy_id}`
        )
      : isAgentlessAgent(restrictions, agent)
      ? new AgentlessAgentRestrictionError(`Cannot rollback managed agent ${agent.id}`)
      : undefined;
    if (restrictionError) {
      if (!errorsByRollbackVersion[rollbackVersion]) {
        errorsByRollbackVersion[rollbackVersion] = {};
      }
      errorsByRollbackVersion[rollbackVersion][agent.id] = restrictionError;
      continue;
    }

    // Agent is eligible for upgrade rollback
    if (!agentsByRollbackVersion[rollbackVersion]) {
      agentsByRollbackVersion[rollbackVersion] = [];
    }
    agentsByRollbackVersion[rollbackVersion].push(agent);
  }

  // Create upgrade actions with rollback:true for each version group with agents
  const actionIds: string[] = [];

  const errorsByActionId: Record<string, Record<Agent['id'], Error>> = {};
  // Which agents already have an error result under each action, so that a group written inside
  // the loop and the pre-action errors assigned afterwards cannot produce two results for one
  // agent.
  const agentsWithErrorResults: Record<string, Set<string>> = {};

  const writeErrorActionResults = async (actionId: string) => {
    const written = (agentsWithErrorResults[actionId] ??= new Set());
    const pending = Object.entries(errorsByActionId[actionId] ?? {}).filter(
      ([agentId]) => !written.has(agentId)
    );
    if (pending.length === 0) {
      return;
    }
    await createErrorActionResults(
      esClient,
      actionId,
      Object.fromEntries(pending),
      'no valid rollback available for agent'
    );
    for (const [agentId] of pending) {
      written.add(agentId);
    }
  };
  const now = new Date().toISOString();
  const namespaces = spaceIds ?? options.spaceIds ?? [];

  for (const [version, agents] of Object.entries(agentsByRollbackVersion)) {
    const actionId = options.actionId ?? createChildActionId(options.childActionIdPrefix);
    const total = options.total ?? agents.length;
    const data = {
      version,
      rollback: true,
    };

    errorsByActionId[actionId] = {};

    // Assign version-specific errors (expired rollbacks, hosted agents) to this action
    if (errorsByRollbackVersion[version]) {
      Object.assign(errorsByActionId[actionId], errorsByRollbackVersion[version]);
    }

    // The agents are marked as rolling back before the action that rolls them back is created, so
    // that an action document implies its agents' bookkeeping has been written. The other way
    // round, a timeout in between leaves agents dispatched but still showing their old upgrade
    // state, and the retry — which deduplicates on the action document — filters exactly those
    // agents out and never comes back to fix them. This way the same timeout leaves agents marked
    // with no action dispatched, which the retry does redo, and both writes are idempotent. This
    // is the order `reassignBatch` already uses.
    await bulkUpdateAgents(
      esClient,
      agents.map((agent) => ({
        agentId: agent.id,
        data: {
          upgraded_at: null,
          upgrade_started_at: now,
        },
      })),
      errorsByActionId[actionId]
    );

    // Only the agents whose bookkeeping actually landed are named by the action. An agent whose
    // update failed was never marked as rolling back, so there is nothing to dispatch to it, and
    // naming it anyway would have it waited on for an acknowledgement it can never send.
    //
    // It is still accounted for: the error results written just below record why it was not
    // actioned, which is what `total` counts it against and what a replay reads to leave it alone.
    // Only a run that dies before that write leaves it with neither a document nor a result, and
    // that is the case where it should be picked up again.
    const agentsToDispatch = agents.filter((agent) => !errorsByActionId[actionId][agent.id]);

    try {
      await createAgentAction(esClient, soClient, {
        id: actionId,
        created_at: now,
        data,
        ack_data: data,
        type: 'UPGRADE',
        total,
        agents: agentsToDispatch.map((agent) => agent.id),
        namespaces,
      });
    } catch (error) {
      // The agents are marked as rolling back and nothing was dispatched. A bulk action retries
      // and both writes are idempotent, but `sendRollbackAgentsActions` also calls this directly
      // for an id list or a small query, and that path has no retry — the agents would be left
      // looking like they are upgrading, which blocks a single-agent rollback of them until the
      // upgrade times out.
      //
      // Only when Elasticsearch refused the write, though. `createAgentAction` writes with
      // `refresh: 'wait_for'`, so plenty of failures reach here with the document already indexed
      // and about to be dispatched, and no read settles it: a search of `.fleet-actions` cannot
      // see a document that has not refreshed yet, and the document's `_id` is a generated uuid
      // rather than the action id, so there is nothing to `get` either. Unmarking agents whose
      // rollback is live would show them as idle while they roll back and let someone start a
      // second rollback on them, which is worse than leaving a mark that the upgrade timeout
      // clears. So the benefit of the doubt goes to "it may have been written", and only the
      // statuses that can only mean a refusal are compensated for.
      //
      // Putting the values back is best effort either way: it runs on a path that is already
      // failing, and if it fails too the caller is no worse off than before it was tried.
      if (isDefiniteRejection(error)) {
        await restoreUpgradeState(esClient, actionId, agentsToDispatch).catch((restoreError) =>
          appContextService
            .getLogger()
            .warn(
              `Could not restore the upgrade state of ${agentsToDispatch.length} agents after a rollback action failed to be created: ${restoreError.message}`
            )
        );
      } else {
        appContextService
          .getLogger()
          .warn(
            `Rollback action ${actionId} may or may not have been created, leaving the upgrade state of its ${agentsToDispatch.length} agents as it is: ${error.message}`
          );
      }
      throw error;
    }

    actionIds.push(actionId);

    // Written as soon as the document they belong to exists, rather than at the end of the
    // function. They are what accounts for the agents this action counts but did not dispatch to,
    // so every write between here and there is another way for the action to be left counting
    // agents that can never resolve under its id. Not inside the try above: a failure here is not
    // a failed dispatch, and compensating for it would unmark agents whose rollback is live.
    await writeErrorActionResults(actionId);
  }

  // Create actions for versions that have errors but no eligible agents
  for (const [version, versionErrors] of Object.entries(errorsByRollbackVersion)) {
    // Skip if we already created an action for this version
    if (agentsByRollbackVersion[version]) {
      continue;
    }

    // Create error-only action for this version
    const actionId = createChildActionId(options.childActionIdPrefix);
    const total = Object.keys(versionErrors).length;

    await createAgentAction(esClient, soClient, {
      id: actionId,
      created_at: now,
      data: {
        version,
        rollback: true,
      },
      ack_data: {
        version,
        rollback: true,
      },
      type: 'UPGRADE',
      total,
      agents: [],
      namespaces,
    });

    actionIds.push(actionId);
    errorsByActionId[actionId] = { ...versionErrors };
  }

  // Create error action results

  // Pre-action errors cannot be associated with a specific rollback version. These errors
  // are assigned to the first action, or to an error-only action if no valid actions were created.
  if (Object.keys(preActionErrors).length > 0) {
    if (actionIds.length > 0) {
      if (!errorsByActionId[actionIds[0]]) {
        errorsByActionId[actionIds[0]] = {};
      }
      Object.assign(errorsByActionId[actionIds[0]], preActionErrors);
    } else {
      const errorOnlyActionId = createChildActionId(options.childActionIdPrefix);
      await createAgentAction(esClient, soClient, {
        id: errorOnlyActionId,
        created_at: now,
        data: {
          rollback: true,
        },
        ack_data: {
          rollback: true,
        },
        type: 'UPGRADE',
        total: Object.keys(preActionErrors).length,
        agents: [],
        namespaces,
      });
      actionIds.push(errorOnlyActionId);
      errorsByActionId[errorOnlyActionId] = preActionErrors;
    }
  }

  // Whatever is left: the error-only actions, and the pre-action errors assigned above to an
  // action whose own results were already written. Anything written in the loop is skipped rather
  // than written twice.
  //
  // Never before the action document it belongs to, which an earlier revision tried: a result
  // written first is orphaned under an action id that never got a document if the action write
  // then fails, and deduplication reads a result as "this agent was handled" — so a replay would
  // skip the agent while `action_status`, which only reads results for actions that exist,
  // ignored the result it left behind.
  for (const actionId of actionIds) {
    await writeErrorActionResults(actionId);
  }

  return {
    actionIds,
  };
}
