/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import { Start } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import type { AlertingServerStart } from '../types';
import { bindContract } from './bind_contract';

describe('bindContract', () => {
  let container: Container;
  let scope: Container;
  let mockRulesClient: Partial<RulesClient>;
  let mockActionPolicyClient: Partial<ActionPolicyClient>;
  let fork: jest.Mock;

  beforeEach(() => {
    container = new Container();
    scope = new Container();
    mockRulesClient = { getRule: jest.fn() };
    mockActionPolicyClient = { getActionPolicy: jest.fn() };
    scope.bind(RulesClient).toConstantValue(mockRulesClient as RulesClient);
    scope.bind(ActionPolicyClient).toConstantValue(mockActionPolicyClient as ActionPolicyClient);

    fork = jest.fn(() => scope);
    container.bind(CoreStart('injection')).toConstantValue({
      fork,
      getContainer: jest.fn(() => container),
    } as never);

    container.loadSync(new ContainerModule((options) => bindContract(options)));
  });

  it('exposes the rules and action-policy client factories on the start contract', () => {
    const start = container.get<AlertingServerStart>(Start);
    expect(start).toEqual({
      getRulesClientWithRequest: expect.any(Function),
      getRulesClientWithRequestInSpace: expect.any(Function),
      getActionPolicyClientWithRequest: expect.any(Function),
      getActionPolicyClientWithRequestInSpace: expect.any(Function),
    });
  });

  it('returns the rulesClient resolved with the request when getRulesClientWithRequest is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get<AlertingServerStart>(Start);

    const client = await start.getRulesClientWithRequest(fakeRequest);

    expect(client).toBe(mockRulesClient);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(scope.get(Request)).toBe(fakeRequest);
  });

  it('binds the spaceId in the scope when getRulesClientWithRequestInSpace is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get<AlertingServerStart>(Start);

    const client = await start.getRulesClientWithRequestInSpace(fakeRequest, 'my-space');

    expect(client).toBe(mockRulesClient);
    expect(scope.get(Request)).toBe(fakeRequest);
    expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
  });

  it('returns the actionPolicyClient resolved with the request when getActionPolicyClientWithRequest is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get<AlertingServerStart>(Start);

    const client = await start.getActionPolicyClientWithRequest(fakeRequest);

    expect(client).toBe(mockActionPolicyClient);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(scope.get(Request)).toBe(fakeRequest);
  });

  it('binds the spaceId in the scope when getActionPolicyClientWithRequestInSpace is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get<AlertingServerStart>(Start);

    const client = await start.getActionPolicyClientWithRequestInSpace(fakeRequest, 'my-space');

    expect(client).toBe(mockActionPolicyClient);
    expect(scope.get(Request)).toBe(fakeRequest);
    expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
  });
});
