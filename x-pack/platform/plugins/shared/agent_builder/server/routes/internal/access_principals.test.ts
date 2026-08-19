/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentAccessControlMode,
  AgentAccessControlRole,
  createAgentNotFoundError,
  type AgentDefinition,
} from '@kbn/agent-builder-common';
import { type IRouter, kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { UserProfile } from '@kbn/core-user-profile-common';
import type { RouteDependencies } from '../types';
import { registerAccessPrincipalsRoutes } from './access_principals';

const profiles = [
  { uid: 'owner-id', enabled: true, data: {}, user: { username: 'owner' } },
  { uid: 'member-id', enabled: true, data: {}, user: { username: 'member' } },
  { uid: 'other-id', enabled: true, data: {}, user: { username: 'other' } },
] satisfies UserProfile[];

const agentWithAccessMode = (
  accessMode: AgentAccessControlMode,
  entries: NonNullable<AgentDefinition['access_control']>['entries'] = []
) => ({
  created_by: { id: 'owner-id', username: 'owner' },
  access_control: { access_mode: accessMode, entries },
});

describe('registerAccessPrincipalsRoutes', () => {
  const routePath = '/internal/agent_builder/_suggest_user_profiles';
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let suggestProfiles: jest.Mock;
  let getAgent: jest.Mock;

  const createContext = () => ({
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
    }),
  });

  const createRequest = (body: { name: string; agent_id?: string }) =>
    httpServerMock.createKibanaRequest({ method: 'post', path: routePath, body });

  beforeEach(() => {
    suggestProfiles = jest.fn().mockResolvedValue(profiles);
    getAgent = jest.fn();
    const handlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};
    const router = {
      post: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            handlers[config.path] = handler;
          }
        ),
    } as unknown as IRouter;

    registerAccessPrincipalsRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      coreSetup: {
        getStartServices: jest.fn().mockResolvedValue([
          {},
          {
            security: {
              userProfiles: { suggest: suggestProfiles },
              authz: { actions: { login: 'login' } },
            },
          },
        ]),
      },
      getInternalServices: () => ({
        agents: { getRegistry: jest.fn().mockResolvedValue({ get: getAgent }) },
      }),
    } as unknown as RouteDependencies);

    routeHandler = handlers[routePath];
  });

  it('preserves the user profile response when agent_id is absent', async () => {
    const response = await routeHandler(
      createContext(),
      createRequest({ name: 'owner' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(profiles);
    expect(getAgent).not.toHaveBeenCalled();
  });

  it('preserves suggestions when the caller cannot read the selected agent', async () => {
    getAgent.mockRejectedValue(createAgentNotFoundError({ agentId: 'hidden-agent' }));

    const response = await routeHandler(
      createContext(),
      createRequest({ name: 'owner', agent_id: 'hidden-agent' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(profiles);
  });

  it.each([AgentAccessControlMode.Public, AgentAccessControlMode.Shared])(
    'marks every suggested user as having access to a %s agent',
    async (accessMode) => {
      getAgent.mockResolvedValue(agentWithAccessMode(accessMode));

      const response = await routeHandler(
        createContext(),
        createRequest({ name: 'owner', agent_id: 'agent-id' }),
        kibanaResponseFactory
      );

      expect(response.payload).toEqual(
        profiles.map((profile) => ({ ...profile, has_agent_access: true }))
      );
    }
  );

  it('marks only the owner and explicitly granted users for a private agent', async () => {
    getAgent.mockResolvedValue(
      agentWithAccessMode(AgentAccessControlMode.Private, [
        { type: 'user', name: 'member', role: AgentAccessControlRole.User },
      ])
    );

    const response = await routeHandler(
      createContext(),
      createRequest({ name: 'owner', agent_id: 'agent-id' }),
      kibanaResponseFactory
    );

    expect(response.payload).toEqual([
      { ...profiles[0], has_agent_access: true },
      { ...profiles[1], has_agent_access: true },
      { ...profiles[2], has_agent_access: false },
    ]);
  });

  it('recognizes a legacy owner recorded without a stable id', async () => {
    getAgent.mockResolvedValue({
      created_by: { username: 'owner' },
      access_control: { access_mode: AgentAccessControlMode.Private, entries: [] },
    });

    const response = await routeHandler(
      createContext(),
      createRequest({ name: 'owner', agent_id: 'agent-id' }),
      kibanaResponseFactory
    );

    expect(response.payload[0].has_agent_access).toBe(true);
    expect(response.payload[1].has_agent_access).toBe(false);
  });
});
