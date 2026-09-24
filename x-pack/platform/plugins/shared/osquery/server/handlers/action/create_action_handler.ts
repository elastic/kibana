/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { filter, isEmpty, isNumber, map, omit, pick, pickBy, some } from 'lodash';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { createDynamicQueries, replacedQueries } from './create_queries';
import { parseAgentSelection } from '../../lib/parse_agent_groups';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import {
  convertSOQueriesToPack,
  isPackQueryEnabled,
  resolveEffectiveQueryExecution,
} from '../../routes/pack/utils';
import { ACTIONS_INDEX, ACTION_EXPIRATION_WEEKS, QUERY_TIMEOUT } from '../../../common/constants';
import { TELEMETRY_EBT_LIVE_QUERY_EVENT } from '../../lib/telemetry/constants';
import type { PackSavedObject } from '../../common/types';
import { CustomHttpRequestError } from '../../common/error';
import { getInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

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

  const { metadata, alertData, error } = options;
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

  let packSO;

  if (params.pack_id) {
    packSO = await spaceScopedInternalSavedObjectsClient.get<PackSavedObject>(
      packSavedObjectType,
      params.pack_id
    );
  }

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
    pack_id: params.pack_id,
    pack_name: packSO?.attributes?.name,
    pack_prebuilt: params.pack_id
      ? some(packSO?.references, ['type', 'osquery-pack-asset'])
      : undefined,
    tags: [],
    space_id: actionSpaceId,
    queries: packSO
      ? map(
          pickBy(convertSOQueriesToPack(packSO.attributes.queries), isPackQueryEnabled),
          (packQuery, packQueryId) => {
            const replacedQuery = replacedQueries(packQuery.query, alertData);
            // Same per-query-wins / empty-or-all-OS-inherits rule as the
            // scheduled emit. `result_type` is intentionally not applied —
            // live-query Fleet actions do not carry snapshot/removed.
            const { version, platform } = resolveEffectiveQueryExecution(packQuery, {
              min_osquery_version: packSO.attributes.min_osquery_version,
              platform: packSO.attributes.platform ?? undefined,
            });

            return pickBy(
              {
                action_id: uuidv4(),
                id: packQueryId,
                ...replacedQuery,
                ...(error ? { error } : {}),
                ecs_mapping: packQuery.ecs_mapping,
                version,
                platform,
                timeout: packQuery.timeout,
                agents: selectedAgents,
              },
              (value) => !isEmpty(value) || isNumber(value)
            );
          }
        )
      : await createDynamicQueries({
          params,
          alertData,
          agents: selectedAgents,
          osqueryContext,
          error,
          spaceId: actionSpaceId,
          spaceScopedClient: spaceScopedInternalSavedObjectsClient,
        }),
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
            // The top-level space_id above never reaches the agent: Fleet Server's
            // action model has no such field, and its checkin conversion copies a
            // fixed whitelist. `data` is an opaque passthrough, and osquerybeat
            // copies it verbatim onto result and action-response documents as
            // `action_data` — so this is what makes the originating space visible
            // in named spaces. Read back via `matchActionDataSpaceId`.
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
    await esClientInternal.bulk({
      refresh: 'wait_for',
      operations: [{ index: { _index: `${ACTIONS_INDEX}-default` } }, osqueryAction],
    });
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
