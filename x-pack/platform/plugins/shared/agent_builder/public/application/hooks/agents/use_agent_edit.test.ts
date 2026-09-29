/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { AgentAccessControlRole, AgentAccessControlMode } from '@kbn/agent-builder-common';
import { useAgentEdit, type AgentEditState } from './use_agent_edit';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateAccessControl = vi.fn();
type MockAgent = AgentEditState & {
  permissions?: { update_agent: boolean; update_access_control: boolean };
};
let mockAgent: MockAgent | undefined;

vi.mock('@kbn/react-query', () => {
      const mocked = {
      // Run the mutationFn directly so the payload passed to the service is observable.
      useMutation: (options: { mutationFn: (data: unknown) => Promise<unknown> }) => ({
        mutateAsync: options.mutationFn,
        isLoading: false,
      }),
      useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/shared-ux-router', () => {
      const mocked = {
      useSearchParams: () => [new URLSearchParams(), vi.fn()],
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../use_agent_builder_service', () => {
      const mocked = {
      useAgentBuilderServices: () => ({
        agentService: {
          create: mockCreate,
          update: mockUpdate,
          updateAccessControl: mockUpdateAccessControl,
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_agent_by_id', () => {
      const mocked = {
      useAgentBuilderAgentById: () => ({ agent: mockAgent, isLoading: false, error: undefined }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../tools/use_tools', () => {
      const mocked = {
      useToolsService: () => ({ tools: [], isLoading: false, error: undefined }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../skills/use_skills', () => {
      const mocked = {
      useSkillsService: () => ({ skills: [], isLoading: false, error: undefined }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../plugins/use_plugins', () => {
      const mocked = {
      usePluginsService: () => ({ plugins: [], isLoading: false, error: undefined }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../use_experimental_features', () => {
      const mocked = {
      useExperimentalFeatures: () => false,
    };
      return { ...mocked, default: mocked };
    });

const baseConfiguration: AgentEditState['configuration'] = {
  instructions: '',
  tools: [{ tool_ids: ['*'] }],
  enable_elastic_capabilities: false,
  workflow_ids: [],
  plugin_ids: [],
};

describe('useAgentEdit submit (create/clone branch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent = undefined;
    mockCreate.mockResolvedValue({ id: 'cloned-agent' });
    mockUpdate.mockResolvedValue({ id: 'existing-agent' });
    mockUpdateAccessControl.mockResolvedValue({
      access_mode: AgentAccessControlMode.Private,
      entries: [],
    });
  });

  it('defaults a brand-new agent to private', () => {
    const { result } = renderHook(() =>
      useAgentEdit({ onSaveSuccess: vi.fn(), onSaveError: vi.fn() })
    );

    expect(result.current.state.access_control).toEqual({
      access_mode: AgentAccessControlMode.Private,
      entries: [],
    });
  });

  it('defaults a brand-new agent to no connectors', () => {
    const { result } = renderHook(() =>
      useAgentEdit({ onSaveSuccess: vi.fn(), onSaveError: vi.fn() })
    );

    expect(result.current.state.configuration.connector_ids).toEqual([]);
  });

  it('strips access control entries, created_by and avatar_icon from the create payload when cloning', async () => {
    const cloneData: AgentEditState = {
      id: 'cloned-agent',
      name: 'Cloned Agent',
      description: 'A clone of an existing agent',
      access_control: {
        access_mode: AgentAccessControlMode.Private,
        entries: [{ type: 'user', id: 'u_alice', role: AgentAccessControlRole.Editor }],
      },
      labels: ['support'],
      avatar_color: '#FFFFFF',
      avatar_symbol: 'CA',
      avatar_icon: 'logoElastic',
      created_by: { id: 'u1', username: 'bob' },
      configuration: baseConfiguration,
    };

    const { result } = renderHook(() =>
      useAgentEdit({ onSaveSuccess: vi.fn(), onSaveError: vi.fn() })
    );

    await act(async () => {
      await result.current.submit(cloneData);
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const payload = mockCreate.mock.calls[0][0];
    expect(payload).not.toHaveProperty('created_by');
    expect(payload).not.toHaveProperty('avatar_icon');
    expect(payload).toMatchObject({
      id: 'cloned-agent',
      name: 'Cloned Agent',
      description: 'A clone of an existing agent',
      access_control: { access_mode: AgentAccessControlMode.Private },
      labels: ['support'],
      avatar_color: '#FFFFFF',
      avatar_symbol: 'CA',
    });
    expect(payload.access_control).not.toHaveProperty('entries');
  });

  it('preserves the standard create fields for a brand-new agent', async () => {
    const newData: AgentEditState = {
      id: 'new-agent',
      name: 'New Agent',
      description: 'A new agent',
      access_control: { access_mode: AgentAccessControlMode.Private, entries: [] },
      labels: [],
      avatar_color: '',
      avatar_symbol: '',
      configuration: baseConfiguration,
    };

    const { result } = renderHook(() =>
      useAgentEdit({ onSaveSuccess: vi.fn(), onSaveError: vi.fn() })
    );

    await act(async () => {
      await result.current.submit(newData);
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      id: 'new-agent',
      name: 'New Agent',
      access_control: { access_mode: AgentAccessControlMode.Private },
    });
    expect(mockCreate.mock.calls[0][0].access_control).not.toHaveProperty('entries');
  });

  it('strips access control entries from regular update payloads', async () => {
    const updateData: AgentEditState = {
      id: 'existing-agent',
      name: 'Existing Agent',
      description: 'An existing agent',
      access_control: {
        access_mode: AgentAccessControlMode.Shared,
        entries: [{ type: 'user', id: 'u_alice', role: AgentAccessControlRole.Editor }],
      },
      labels: [],
      avatar_color: '',
      avatar_symbol: '',
      configuration: baseConfiguration,
    };

    const { result } = renderHook(() =>
      useAgentEdit({
        editingAgentId: 'existing-agent',
        onSaveSuccess: vi.fn(),
        onSaveError: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.submit(updateData);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload).toMatchObject({
      access_control: { access_mode: AgentAccessControlMode.Shared },
    });
    expect(payload.access_control).not.toHaveProperty('entries');
    expect(mockUpdateAccessControl).not.toHaveBeenCalled();
  });

  it('updates access control entries separately from regular update payloads', async () => {
    mockAgent = {
      id: 'existing-agent',
      name: 'Existing Agent',
      description: 'An existing agent',
      access_control: {
        access_mode: AgentAccessControlMode.Private,
        entries: [
          { type: 'user', id: 'u_bob', role: AgentAccessControlRole.User },
          { type: 'user', id: 'u_alice', role: AgentAccessControlRole.Editor },
        ],
      },
      labels: [],
      avatar_color: '',
      avatar_symbol: '',
      configuration: baseConfiguration,
    };

    const updateData: AgentEditState = {
      ...mockAgent,
      access_control: {
        access_mode: AgentAccessControlMode.Private,
        entries: [{ type: 'user', id: 'u_alice', role: AgentAccessControlRole.Editor }],
      },
    };

    const { result } = renderHook(() =>
      useAgentEdit({
        editingAgentId: 'existing-agent',
        onSaveSuccess: vi.fn(),
        onSaveError: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.submit(updateData);
    });

    expect(mockUpdateAccessControl).toHaveBeenCalledTimes(1);
    expect(mockUpdateAccessControl).toHaveBeenCalledWith('existing-agent', {
      entries: [{ type: 'user', id: 'u_alice', role: AgentAccessControlRole.Editor }],
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateAccessControl.mock.invocationCallOrder[0]
    );
    expect(mockUpdate.mock.calls[0][1].access_control).toEqual({
      access_mode: AgentAccessControlMode.Private,
    });
    expect(mockUpdate.mock.calls[0][1].access_control).not.toHaveProperty('entries');
  });

  it('strips the server-stamped added_at from the access control update payload', async () => {
    mockAgent = {
      id: 'existing-agent',
      name: 'Existing Agent',
      description: 'An existing agent',
      access_control: {
        access_mode: AgentAccessControlMode.Private,
        entries: [
          {
            type: 'user',
            id: 'u_alice',
            role: AgentAccessControlRole.User,
            added_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      labels: [],
      avatar_color: '',
      avatar_symbol: '',
      configuration: baseConfiguration,
    };

    const updateData: AgentEditState = {
      ...mockAgent,
      access_control: {
        access_mode: AgentAccessControlMode.Private,
        entries: [
          {
            type: 'user',
            id: 'u_alice',
            role: AgentAccessControlRole.Editor,
            added_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    const { result } = renderHook(() =>
      useAgentEdit({
        editingAgentId: 'existing-agent',
        onSaveSuccess: vi.fn(),
        onSaveError: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.submit(updateData);
    });

    expect(mockUpdateAccessControl).toHaveBeenCalledWith('existing-agent', {
      entries: [{ type: 'user', id: 'u_alice', role: AgentAccessControlRole.Editor }],
    });
    expect(mockUpdateAccessControl.mock.calls[0][1].entries[0]).not.toHaveProperty('added_at');
  });

  it('exposes permissions separately from editable form state', async () => {
    mockAgent = {
      id: 'existing-agent',
      name: 'Existing Agent',
      description: 'An existing agent',
      access_control: { access_mode: AgentAccessControlMode.Private, entries: [] },
      labels: [],
      avatar_color: '',
      avatar_symbol: '',
      configuration: baseConfiguration,
      permissions: { update_agent: true, update_access_control: false },
    };

    const { result } = renderHook(() =>
      useAgentEdit({
        editingAgentId: 'existing-agent',
        onSaveSuccess: vi.fn(),
        onSaveError: vi.fn(),
      })
    );

    expect(result.current.permissions).toEqual({
      update_agent: true,
      update_access_control: false,
    });
    expect(result.current.state).not.toHaveProperty('permissions');
  });
});
