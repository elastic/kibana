/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import { CoreScopedHistory } from '@kbn/core-application-browser-internal';
import { AGENTBUILDER_PATH } from '../../common/features';
import {
  clearAgentWorkspaceNavigation,
  requestAgentWorkspaceNavigation,
  setAgentWorkspaceScopedHistory,
} from './agent_workspace_navigation';

describe('agent_workspace_navigation', () => {
  beforeEach(() => {
    clearAgentWorkspaceNavigation();
  });

  it('queues navigation until scoped history is registered', () => {
    requestAgentWorkspaceNavigation('/manage/tools');

    const memoryHistory = createMemoryHistory({ initialEntries: [AGENTBUILDER_PATH] });
    const scopedHistory = new CoreScopedHistory(memoryHistory, AGENTBUILDER_PATH);

    setAgentWorkspaceScopedHistory(scopedHistory);

    expect(scopedHistory.location.pathname).toBe('/manage/tools');
  });

  it('navigates immediately when scoped history is already registered', () => {
    const memoryHistory = createMemoryHistory({ initialEntries: [AGENTBUILDER_PATH] });
    const scopedHistory = new CoreScopedHistory(memoryHistory, AGENTBUILDER_PATH);
    setAgentWorkspaceScopedHistory(scopedHistory);

    requestAgentWorkspaceNavigation('/manage/agents', { shouldStickToBottom: true });

    expect(scopedHistory.location.pathname).toBe('/manage/agents');
    expect(scopedHistory.location.state).toEqual({ shouldStickToBottom: true });
  });
});
