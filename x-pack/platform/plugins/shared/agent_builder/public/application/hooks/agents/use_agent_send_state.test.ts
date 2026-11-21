/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useUiPrivileges } from '../use_ui_privileges';
import { useAgentBuilderAgentById } from './use_agent_by_id';
import { useAgentBuilderAgents } from './use_agents';
import { useAgentModel } from './use_agent_model';
import { useValidateAgentId } from './use_validate_agent_id';
import { useAgentSendState } from './use_agent_send_state';

jest.mock('../use_ui_privileges');
jest.mock('./use_agent_by_id');
jest.mock('./use_agents');
jest.mock('./use_agent_model');
jest.mock('./use_validate_agent_id');

const listedIds = new Set<string>();

const setState = ({
  listed = true,
  isFetched = true,
  byId,
  isLoadingById = false,
  isModelLoading = false,
  invokeBoundAgents = true,
}: {
  listed?: boolean;
  isFetched?: boolean;
  byId?: { service_account_id?: string };
  isLoadingById?: boolean;
  isModelLoading?: boolean;
  invokeBoundAgents?: boolean;
} = {}) => {
  listedIds.clear();
  if (listed) listedIds.add('agent-1');
  jest.mocked(useAgentBuilderAgents).mockReturnValue({ isFetched } as never);
  jest
    .mocked(useValidateAgentId)
    .mockReturnValue(((id?: string) => Boolean(id && listedIds.has(id))) as never);
  jest
    .mocked(useAgentBuilderAgentById)
    .mockImplementation(
      (id?: string) =>
        ({ agent: id && byId ? byId : null, isLoading: Boolean(id) && isLoadingById } as never)
    );
  jest.mocked(useAgentModel).mockReturnValue({ isLoading: isModelLoading, isLocked: false });
  jest.mocked(useUiPrivileges).mockReturnValue({ invokeBoundAgents } as never);
};

describe('useAgentSendState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats an agent in the list as existing and usable', () => {
    setState();

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current).toEqual({
      agent: undefined,
      agentExists: true,
      isAgentDeleted: false,
      isBoundAgentForbidden: false,
      isAgentModelLoading: false,
    });
  });

  it('finds an agent that is not in the list by its id, such as a hidden one', () => {
    setState({ listed: false, byId: { name: 'hidden agent' } as never });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.agentExists).toBe(true);
    expect(result.current.isAgentDeleted).toBe(false);
    expect(result.current.agent).toEqual({ name: 'hidden agent' });
  });

  it('returns the agent it looked up for an agent in the list', () => {
    setState({ byId: { name: 'listed agent' } as never });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.agent).toEqual({ name: 'listed agent' });
  });

  it('reports an agent that is in neither place as deleted', () => {
    setState({ listed: false });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.agentExists).toBe(false);
    expect(result.current.isAgentDeleted).toBe(true);
  });

  it('does not report the agent as deleted before the agents are fetched', () => {
    setState({ listed: false, isFetched: false });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.isAgentDeleted).toBe(false);
  });

  it('does not report the agent as deleted while it is being looked up by id', () => {
    setState({ listed: false, isLoadingById: true });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.isAgentDeleted).toBe(false);
  });

  it('does not report a deleted agent when there is no agent id', () => {
    setState({ listed: false });

    const { result } = renderHook(() => useAgentSendState(undefined));

    expect(result.current.isAgentDeleted).toBe(false);
  });

  it('forbids an agent bound to a service account when the user cannot invoke it', () => {
    setState({ byId: { service_account_id: 'sa-1' }, invokeBoundAgents: false });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.isBoundAgentForbidden).toBe(true);
  });

  it('forbids a bound agent found by its id when it is not in the list, such as a hidden one', () => {
    setState({ listed: false, byId: { service_account_id: 'sa-1' }, invokeBoundAgents: false });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.agentExists).toBe(true);
    expect(result.current.isBoundAgentForbidden).toBe(true);
  });

  it('allows an agent bound to a service account when the user can invoke it', () => {
    setState({ byId: { service_account_id: 'sa-1' }, invokeBoundAgents: true });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.isBoundAgentForbidden).toBe(false);
  });

  it('passes on that the agent model is loading', () => {
    setState({ isModelLoading: true });

    const { result } = renderHook(() => useAgentSendState('agent-1'));

    expect(result.current.isAgentModelLoading).toBe(true);
  });
});
