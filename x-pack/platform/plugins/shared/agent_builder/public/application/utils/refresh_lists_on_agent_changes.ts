/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { QueryClient, QueryKey } from '@kbn/react-query';
import type { ApiReference } from '@kbn/agent-builder-common/apis/known_apis';
import { matchesAnyApiSelector } from '@kbn/agent-builder-common/apis/known_apis';
import type { EventsService } from '../../services/events';
import { queryKeys } from '../query_keys';

interface ListRefresh {
  queryKey: QueryKey;
  apis: readonly ApiReference[];
  exact?: boolean;
}

const kibanaApis = (...apiIds: string[]): ApiReference[] =>
  apiIds.map((api) => ({ target: 'kibana', api }));

const listRefreshes: readonly ListRefresh[] = [
  {
    queryKey: queryKeys.agentProfiles.all,
    apis: kibanaApis(
      'agent-builder.post-agent-builder-agents',
      'agent-builder.put-agent-builder-agents-id',
      'agent-builder.delete-agent-builder-agents-id',
      'agent-builder.put-agent-builder-agents-id-access-control',
      'agent-builder.delete-agent-builder-plugins-pluginid'
    ),
  },
  {
    queryKey: queryKeys.tools.all,
    apis: kibanaApis(
      'agent-builder.post-agent-builder-tools',
      'agent-builder.put-agent-builder-tools-toolid',
      'agent-builder.delete-agent-builder-tools-toolid'
    ),
  },
  {
    queryKey: queryKeys.skills.list,
    apis: kibanaApis(
      'agent-builder.post-agent-builder-skills',
      'agent-builder.put-agent-builder-skills-skillid',
      'agent-builder.delete-agent-builder-skills-skillid',
      'agent-builder.post-agent-builder-plugins-install',
      'agent-builder.delete-agent-builder-plugins-pluginid'
    ),
  },
  {
    queryKey: queryKeys.skills.allByAgent,
    exact: false,
    apis: kibanaApis(
      'agent-builder.post-agent-builder-skills',
      'agent-builder.put-agent-builder-skills-skillid',
      'agent-builder.delete-agent-builder-skills-skillid',
      'agent-builder.put-agent-builder-agents-id',
      'agent-builder.post-agent-builder-plugins-install',
      'agent-builder.delete-agent-builder-plugins-pluginid'
    ),
  },
  {
    queryKey: queryKeys.plugins.all,
    apis: kibanaApis(
      'agent-builder.post-agent-builder-plugins-install',
      'agent-builder.delete-agent-builder-plugins-pluginid'
    ),
  },
];

const allListApis = listRefreshes.flatMap(({ apis }) => apis);

/**
 * Refreshes the agents, tools, skills and plugins lists when the agent changes them through
 * `execute_api`.
 *
 * @returns The subscription to unsubscribe when the app unmounts.
 */
export const refreshListsOnAgentChanges = ({
  eventsService,
  queryClient,
}: {
  eventsService: EventsService;
  queryClient: QueryClient;
}): Subscription =>
  eventsService.getApiStateChanges$({ apis: allListApis }).subscribe((change) => {
    listRefreshes
      .filter(({ apis }) => matchesAnyApiSelector(apis, change))
      .forEach(({ queryKey, exact = true }) => {
        queryClient.invalidateQueries({ queryKey, exact });
      });
  });
