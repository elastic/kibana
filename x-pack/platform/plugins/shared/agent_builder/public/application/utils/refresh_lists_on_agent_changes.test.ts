/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { QueryClient } from '@kbn/react-query';
import {
  API_STATE_CHANGED_UI_EVENT,
  ChatEventType,
  type ApiStateChangedEventData,
} from '@kbn/agent-builder-common';
import { findUnknownApis } from '@kbn/agent-builder-common/apis/known_apis';
import { EventsService } from '../../services/events';
import { queryKeys } from '../query_keys';
import { refreshListsOnAgentChanges } from './refresh_lists_on_agent_changes';

const kibanaChange = (api: string): ApiStateChangedEventData => ({
  target: 'kibana',
  api,
  method: 'POST',
  path: '/api/agent_builder/whatever',
});

describe('refreshListsOnAgentChanges', () => {
  let eventsService: EventsService;
  let queryClient: QueryClient;
  let invalidateQueries: jest.SpyInstance;
  let listRefresh: Subscription;

  const reportChange = (change: ApiStateChangedEventData) => {
    eventsService.propagateChatEvent('conversation-1', {
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'execute_api',
        tool_call_id: 'call-1',
        custom_event: API_STATE_CHANGED_UI_EVENT,
        data: change,
      },
    });
  };

  const startListRefresh = () => {
    listRefresh = refreshListsOnAgentChanges({ eventsService, queryClient });
  };

  beforeEach(() => {
    eventsService = new EventsService();
    eventsService.setActiveConversation({ id: 'conversation-1' });
    queryClient = new QueryClient();
    invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  });

  afterEach(() => {
    listRefresh?.unsubscribe();
  });

  const agentsList = { queryKey: queryKeys.agentProfiles.all, exact: true };
  const toolsList = { queryKey: queryKeys.tools.all, exact: true };
  const skillsList = { queryKey: queryKeys.skills.list, exact: true };
  const skillsByAgent = { queryKey: queryKeys.skills.allByAgent, exact: false };
  const pluginsList = { queryKey: queryKeys.plugins.all, exact: true };

  it.each([
    ['agent-builder.post-agent-builder-agents', [agentsList]],
    ['agent-builder.put-agent-builder-agents-id', [agentsList, skillsByAgent]],
    ['agent-builder.put-agent-builder-agents-id-access-control', [agentsList]],
    ['agent-builder.delete-agent-builder-tools-toolid', [toolsList]],
    ['agent-builder.put-agent-builder-skills-skillid', [skillsList, skillsByAgent]],
    ['agent-builder.post-agent-builder-plugins-install', [skillsList, skillsByAgent, pluginsList]],
    [
      'agent-builder.delete-agent-builder-plugins-pluginid',
      [agentsList, skillsList, skillsByAgent, pluginsList],
    ],
  ])('refreshes only the lists %s changes', (api, expectedFilters) => {
    startListRefresh();

    reportChange(kibanaChange(api));

    expect(invalidateQueries.mock.calls.map(([filters]) => filters)).toEqual(expectedFilters);
  });

  it("refreshes every agent's skills but not a skill's detail query", async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.skills.byAgent('agent-a'),
      queryFn: jest.fn().mockResolvedValue([]),
    });
    await queryClient.prefetchQuery({
      queryKey: queryKeys.skills.byAgent('agent-b'),
      queryFn: jest.fn().mockResolvedValue([]),
    });
    await queryClient.prefetchQuery({
      queryKey: queryKeys.skills.byId('my-skill'),
      queryFn: jest.fn().mockResolvedValue({ id: 'my-skill' }),
    });
    startListRefresh();

    reportChange(kibanaChange('agent-builder.put-agent-builder-skills-skillid'));

    expect(queryClient.getQueryState(queryKeys.skills.byAgent('agent-a'))?.isInvalidated).toBe(
      true
    );
    expect(queryClient.getQueryState(queryKeys.skills.byAgent('agent-b'))?.isInvalidated).toBe(
      true
    );
    expect(queryClient.getQueryState(queryKeys.skills.byId('my-skill'))?.isInvalidated).toBe(false);
  });

  it('leaves the detail query behind an open edit form untouched', async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.agentProfiles.all,
      queryFn: jest.fn().mockResolvedValue([]),
    });
    await queryClient.prefetchQuery({
      queryKey: queryKeys.agentProfiles.byId('my-agent'),
      queryFn: jest.fn().mockResolvedValue({ id: 'my-agent' }),
    });
    startListRefresh();

    reportChange(kibanaChange('agent-builder.put-agent-builder-agents-id'));

    expect(queryClient.getQueryState(queryKeys.agentProfiles.all)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.agentProfiles.byId('my-agent'))?.isInvalidated).toBe(
      false
    );
  });

  it('ignores operations that do not change a list', () => {
    startListRefresh();

    reportChange(kibanaChange('agent-builder.post-agent-builder-tools-execute'));
    reportChange(kibanaChange('cases.create-case'));
    reportChange({
      ...kibanaChange('agent-builder.post-agent-builder-agents'),
      target: 'elasticsearch',
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('stops refreshing once unsubscribed', () => {
    startListRefresh();

    listRefresh.unsubscribe();
    reportChange(kibanaChange('agent-builder.post-agent-builder-agents'));

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('only maps operations the Kibana API registry ships', () => {
    const getApiStateChanges = jest.spyOn(eventsService, 'getApiStateChanges$');
    startListRefresh();

    const [[{ apis }]] = getApiStateChanges.mock.calls;
    expect(apis).not.toHaveLength(0);
    expect(findUnknownApis(apis)).toEqual([]);
  });
});
