/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { filter, map, omit, pick, some } from 'lodash';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { buildQueries } from './create_queries';
import { parseAgentSelection } from '../../lib/parse_agent_groups';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { ACTIONS_INDEX, ACTION_EXPIRATION_WEEKS, QUERY_TIMEOUT } from '../../../common/constants';
import { TELEMETRY_EBT_LIVE_QUERY_EVENT } from '../../lib/telemetry/constants';
import type { PackSavedObject } from '../../common/types';
import { CustomHttpRequestError } from '../../common/error';
import {
  PACK_LOOKUP_FAILED,
  PACK_NOT_FOUND,
  QUERY_NOT_PROVIDED,
} from '../../../common/translations/errors';
import { getInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type { DispatchEntryPoint } from './dispatch_source';
import { resolveRuleRunDispatchSource } from './dispatch_source';

interface Metadata {
  currentUser: string | undefined;
  userProfileUid: string | undefined;
}

interface OsqueryActionQuery {
  action_id?: string;
  id?: string;
  query?: string;
  ecs_mapping?: Record<string, unknown>;
  version?: string;
  platform?: string;
  timeout?: number;
  agents?: string[];
  error?: string;
}

interface CreateActionHandlerOptions {
  space?: { id: string };
  metadata?: Metadata;
  alertData?: ParsedTechnicalFields & { _index: string };
  error?: string;
  dispatch: DispatchEntryPoint;
}

export const createActionHandler = async (
  osqueryContext: OsqueryAppContext,
  params: CreateLiveQueryRequestBodySchema,
  options: CreateActionHandlerOptions
) => {
  const [coreStartServices] = await osqueryContext.getStartServices();
  const esClientInternal = coreStartServices.elasticsearch.client.asInternalUser;
  const actionSpaceId = options.space?.id ?? DEFAULT_SPACE_ID;

  const spaceScopedInternalSavedObjectsClient = getInternalSavedObjectsClientForSpaceId(
    coreStartServices,
    actionSpaceId
  );

  const { metadata, alertData, error, dispatch } = options;
  const elasticsearchClient = coreStartServices.elasticsearch.client.asInternalUser;
  const {
    agent_all: agentAll,
    agent_ids: agentIds,
    agent_platforms: agentPlatforms,
    agent_policy_ids: agentPolicyIds,
  } = params;
  const selectedAgents = await parseAgentSelection(
    spaceScopedInternalSavedObjectsClient,
    elasticsearchClient,
    osqueryContext,
    {
      agents: agentIds,
      allAgentsSelected: !!agentAll,
      platformsSelected: agentPlatforms,
      policiesSelected: agentPolicyIds,
      spaceId: actionSpaceId,
    }
  );

  if (!selectedAgents.length) {
    throw new CustomHttpRequestError('No agents found for selection', 400);
  }

  // Resolve the dispatch source once per entry point.
  let dispatchSource =
    dispatch.entryPoint === 'live_query'
      ? dispatch.source
      : await resolveRuleRunDispatchSource(
          params,
          dispatch.preflight,
          spaceScopedInternalSavedObjectsClient
        );

  // Load pack SO when the dispatch source references one, or when a caller is running pack_id.
  let packSO:
    | { attributes: PackSavedObject; id: string; references: Array<{ type: string }> }
    | undefined;
  const packId = params.pack_id?.trim();

  const needsPackLoad =
    (dispatchSource.kind === 'caller' && packId) || dispatchSource.kind === 'pack';

  if (needsPackLoad) {
    const resolvedPackId =
      dispatchSource.kind === 'pack' ? dispatchSource.packSavedObjectId : packId!;

    try {
      packSO = await spaceScopedInternalSavedObjectsClient.get<PackSavedObject>(
        packSavedObjectType,
        resolvedPackId
      );
    } catch (packError) {
      const isRuleRun = dispatch.entryPoint === 'rule_run';
      const errorLabel = SavedObjectsErrorHelpers.isNotFoundError(packError)
        ? PACK_NOT_FOUND
        : PACK_LOOKUP_FAILED;

      if (!isRuleRun) {
        // Live queries throw — the caller gets a 400.
        throw packError;
      }

      // Rule runs record an error row so the alert's Osquery Results tab shows why nothing ran.
      dispatchSource = {
        kind: 'unresolved',
        referenceId: resolvedPackId,
        error: errorLabel,
      };
    }
  }

  const queries = await buildQueries({
    source: dispatchSource,
    params,
    alertData,
    agents: selectedAgents,
    osqueryContext,
    error,
    spaceId: actionSpaceId,
    spaceScopedClient: spaceScopedInternalSavedObjectsClient,
    packSO,
  });

  // D5: empty-SQL invariant — every dispatchable row must carry non-empty SQL.
  const isRuleRun = dispatch.entryPoint === 'rule_run';
  const queriesWithEmptySqlFixed = queries.map((row) => {
    if (!row.error && !row.query) {
      if (!isRuleRun) {
        throw new CustomHttpRequestError(QUERY_NOT_PROVIDED, 400);
      }

      return { ...row, error: QUERY_NOT_PROVIDED };
    }

    return row;
  });

  const osqueryAction = {
    action_id: uuidv4(),
    '@timestamp': moment().toISOString(),
    expiration: moment().add(ACTION_EXPIRATION_WEEKS, 'weeks').toISOString(),
    type: 'INPUT_ACTION',
    input_type: 'osquery',
    alert_ids: params.alert_ids,
    event_ids: params.event_ids,
    case_ids: params.case_ids,
    agent_ids: params.agent_ids,
    agent_all: params.agent_all,
    agent_platforms: params.agent_platforms,
    agent_policy_ids: params.agent_policy_ids,
    agents: selectedAgents,
    user_id: metadata?.currentUser,
    user_profile_uid: metadata?.userProfileUid,
    metadata: params.metadata,
    pack_id: packId,
    pack_name: packSO?.attributes?.name,
    pack_prebuilt: packId ? some(packSO?.references, ['type', 'osquery-pack-asset']) : undefined,
    tags: [],
    space_id: actionSpaceId,
    queries: queriesWithEmptySqlFixed,
  };

  const actionQueries = osqueryAction.queries as OsqueryActionQuery[];
  const fleetActions = !error
    ? map(
        filter(actionQueries, (query) => !query.error),
        (query) => ({
          action_id: query.action_id as string,
          '@timestamp': moment().toISOString(),
          expiration: moment().add(ACTION_EXPIRATION_WEEKS, 'weeks').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          agents: query.agents as string[],
          user_id: metadata?.currentUser,
          space_id: actionSpaceId,
          ...(query.timeout !== QUERY_TIMEOUT.DEFAULT ? { timeout: query.timeout } : {}),
          data: {
            ...pick(query, ['id', 'query', 'ecs_mapping', 'version', 'platform']),
            space_id: actionSpaceId,
          } as {
            [k: string]: unknown;
          },
        })
      )
    : [];

  if (fleetActions.length) {
    await osqueryContext.service.getFleetActionsClient()?.bulkCreate(fleetActions);
  }

  const actionsComponentTemplateExists = await esClientInternal.indices.exists({
    index: `${ACTIONS_INDEX}*`,
  });

  if (actionsComponentTemplateExists) {
    const bulkResponse = await esClientInternal.bulk({
      refresh: 'wait_for',
      operations: [{ index: { _index: `${ACTIONS_INDEX}-default` } }, osqueryAction],
    });

    // `bulk` reports item failures in the body instead of throwing. Result reads are
    // authorized against this document, so without it they 404 for this action.
    if (bulkResponse.errors) {
      const reason = bulkResponse.items[0]?.index?.error?.reason ?? 'unknown error';
      throw new Error(
        `Failed to write osquery action document ${osqueryAction.action_id}: ${reason}`
      );
    }
  }

  osqueryContext.telemetryEventsSender.reportEvent(TELEMETRY_EBT_LIVE_QUERY_EVENT, {
    ...omit(osqueryAction, ['type', 'input_type', 'user_id', 'user_profile_uid', 'error']),
    agents: osqueryAction.agents.length,
  });

  return {
    response: osqueryAction,
    fleetActionsCount: fleetActions.length,
  };
};
