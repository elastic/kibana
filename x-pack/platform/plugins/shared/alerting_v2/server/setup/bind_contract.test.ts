/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import { Start, PluginStart, type ServiceToken } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { ExecutionError } from '@kbn/workflows/server';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { AlertEventsClient } from '../lib/alert_events_client';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import type { AlertingServerStart } from '../types';
import { bindContract } from './bind_contract';

const AlertingStartToken = Start as ServiceToken<AlertingServerStart>;

const createMockSecurity = ({ hasAllRequested }: { hasAllRequested: boolean }) => ({
  authz: {
    checkPrivilegesWithRequest: jest.fn().mockReturnValue({
      atSpace: jest.fn().mockResolvedValue({ hasAllRequested }),
    }),
    actions: {
      api: { get: jest.fn().mockReturnValue('api:write-alerting-v2-alerts') },
    },
  },
});

const mockSpaces = {
  spacesService: { getSpaceId: jest.fn().mockReturnValue('default') },
};

describe('bindContract', () => {
  let container: Container;
  let scope: Container;
  let mockRulesClient: Partial<RulesClient>;
  let mockActionPolicyClient: Partial<ActionPolicyClient>;
  let mockAlertEventsClient: Partial<AlertEventsClient>;
  let fork: jest.Mock;

  beforeEach(() => {
    container = new Container();
    scope = new Container();
    mockRulesClient = { getRule: jest.fn() };
    mockActionPolicyClient = { getActionPolicy: jest.fn() };
    mockAlertEventsClient = { ingestAlertEvent: jest.fn() };
    scope.bind(RulesClient).toConstantValue(mockRulesClient as RulesClient);
    scope.bind(ActionPolicyClient).toConstantValue(mockActionPolicyClient as ActionPolicyClient);
    scope.bind(AlertEventsClient).toConstantValue(mockAlertEventsClient as AlertEventsClient);

    fork = jest.fn(() => scope);
    container.bind(CoreStart('injection')).toConstantValue({
      fork,
      getContainer: jest.fn(() => container),
    } as never);

    container
      .bind(PluginStart('security'))
      .toConstantValue(createMockSecurity({ hasAllRequested: true }));
    container.bind(PluginStart('spaces')).toConstantValue(mockSpaces);

    container.load(new ContainerModule((options) => bindContract(options)));
  });

  it('exposes all client factories on the start contract', () => {
    const start = container.get(AlertingStartToken);
    expect(start).toEqual({
      getRulesClientWithRequest: expect.any(Function),
      getRulesClientWithRequestInSpace: expect.any(Function),
      getActionPolicyClientWithRequest: expect.any(Function),
      getActionPolicyClientWithRequestInSpace: expect.any(Function),
      getAlertEventsClientWithRequest: expect.any(Function),
    });
  });

  it('returns the rulesClient resolved with the request when getRulesClientWithRequest is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get(AlertingStartToken);

    const client = await start.getRulesClientWithRequest(fakeRequest);

    expect(client).toBe(mockRulesClient);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(scope.get(Request)).toBe(fakeRequest);
  });

  it('binds the spaceId in the scope when getRulesClientWithRequestInSpace is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get(AlertingStartToken);

    const client = await start.getRulesClientWithRequestInSpace(fakeRequest, 'my-space');

    expect(client).toBe(mockRulesClient);
    expect(scope.get(Request)).toBe(fakeRequest);
    expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
  });

  it('returns the actionPolicyClient resolved with the request when getActionPolicyClientWithRequest is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get(AlertingStartToken);

    const client = await start.getActionPolicyClientWithRequest(fakeRequest);

    expect(client).toBe(mockActionPolicyClient);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(scope.get(Request)).toBe(fakeRequest);
  });

  it('binds the spaceId in the scope when getActionPolicyClientWithRequestInSpace is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get(AlertingStartToken);

    const client = await start.getActionPolicyClientWithRequestInSpace(fakeRequest, 'my-space');

    expect(client).toBe(mockActionPolicyClient);
    expect(scope.get(Request)).toBe(fakeRequest);
    expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
  });

  describe('getAlertEventsClientWithRequest', () => {
    it('returns the alertEventsClient when the privilege check passes', async () => {
      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const start = container.get(AlertingStartToken);

      const client = await start.getAlertEventsClientWithRequest(fakeRequest);

      expect(client).toBe(mockAlertEventsClient);
      expect(scope.get(Request)).toBe(fakeRequest);
    });

    it('throws a PermissionError when the privilege check fails', async () => {
      const deniedContainer = new Container();
      const deniedScope = new Container();
      deniedScope
        .bind(AlertEventsClient)
        .toConstantValue(mockAlertEventsClient as AlertEventsClient);
      deniedContainer.bind(CoreStart('injection')).toConstantValue({
        fork: jest.fn(() => deniedScope),
        getContainer: jest.fn(() => deniedContainer),
      } as never);
      deniedContainer
        .bind(PluginStart('security'))
        .toConstantValue(createMockSecurity({ hasAllRequested: false }));
      deniedContainer.bind(PluginStart('spaces')).toConstantValue(mockSpaces);
      deniedContainer.load(new ContainerModule((options) => bindContract(options)));

      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const start = deniedContainer.get(AlertingStartToken);

      const error = await start.getAlertEventsClientWithRequest(fakeRequest).catch((e) => e);

      expect(error).toBeInstanceOf(ExecutionError);
      expect(error.type).toBe('PermissionError');
    });
  });
});
