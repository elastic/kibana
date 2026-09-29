/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import type { ServiceToken } from '@kbn/core-di';
import { PluginStart, Setup, Start } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { coreMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { AlertEventsClient } from '../lib/alert_events_client';
import { ArtifactTypeRegistry } from '../lib/artifact_types';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import { RuleSavedObjectsClientToken } from '../lib/services/rules_saved_object_service/tokens';
import type { AlertingServerSetup, AlertingServerStart } from '../types';
import { bindContract } from './bind_contract';
import { asSpaceId } from '@kbn/core-spaces-common';

const AlertingStartToken = Start as ServiceToken<AlertingServerStart>;
const AlertingSetupToken = Setup as ServiceToken<AlertingServerSetup>;

describe('bindContract', () => {
  let container: Container;
  let scope: Container;
  let mockRulesClient: Partial<RulesClient>;
  let mockActionPolicyClient: Partial<ActionPolicyClient>;
  let mockAlertEventsClient: Partial<AlertEventsClient>;
  let fork: jest.Mock;
  let savedObjects: ReturnType<typeof coreMock.createStart>['savedObjects'];
  let spaces: ReturnType<typeof spacesMock.createStart>;

  beforeEach(() => {
    container = new Container();
    scope = new Container();
    mockRulesClient = {
      getRule: jest.fn(),
      bulkDisableRules: jest.fn().mockResolvedValue({ affected_count: 1, errors: [] }),
    };
    mockActionPolicyClient = { getActionPolicy: jest.fn() };
    mockAlertEventsClient = { createAlertEvent: jest.fn() };
    scope.bind(RulesClient).toConstantValue(mockRulesClient as RulesClient);
    scope.bind(ActionPolicyClient).toConstantValue(mockActionPolicyClient as ActionPolicyClient);
    scope.bind(AlertEventsClient).toConstantValue(mockAlertEventsClient as AlertEventsClient);

    fork = jest.fn(() => scope);
    container.bind(CoreStart('injection')).toConstantValue({
      fork,
      getContainer: jest.fn(() => container),
    } as never);
    container.bind(ArtifactTypeRegistry).toSelf().inSingletonScope();
    savedObjects = coreMock.createStart().savedObjects;
    spaces = spacesMock.createStart();
    spaces.spacesService.spaceIdToNamespace.mockImplementation((spaceId: string) =>
      spaceId === 'default' ? undefined : spaceId
    );
    container.bind(CoreStart('savedObjects')).toConstantValue(savedObjects);
    container.bind(PluginStart('spaces')).toConstantValue(spaces);

    container.load(new ContainerModule((options) => bindContract(options)));
  });

  it('exposes registerArtifactType on the setup contract', () => {
    const setup = container.get(AlertingSetupToken);
    expect(setup).toEqual({
      registerArtifactType: expect.any(Function),
    });
  });

  it('exposes all client factories on the start contract', () => {
    const start = container.get(AlertingStartToken);
    expect(start).toEqual({
      getRulesClientWithRequest: expect.any(Function),
      getRulesClientWithRequestInSpace: expect.any(Function),
      disableRulesAsInternalUser: expect.any(Function),
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

    const client = await start.getRulesClientWithRequestInSpace(fakeRequest, asSpaceId('my-space'));

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

    const client = await start.getActionPolicyClientWithRequestInSpace(
      fakeRequest,
      asSpaceId('my-space')
    );

    expect(client).toBe(mockActionPolicyClient);
    expect(scope.get(Request)).toBe(fakeRequest);
    expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
  });

  it('returns the alertEventsClient resolved with the request when getAlertEventsClientWithRequest is called', async () => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    const start = container.get(AlertingStartToken);

    const client = await start.getAlertEventsClientWithRequest(fakeRequest);

    expect(client).toBe(mockAlertEventsClient);
    expect(fork).toHaveBeenCalledTimes(1);
    expect(scope.get(Request)).toBe(fakeRequest);
  });

  describe('disableRulesAsInternalUser', () => {
    it('disables the rules through an internal-user rules SO client bound to the space', async () => {
      const internalClient = savedObjects.getUnsafeInternalClient();
      const namespacedClient = savedObjects.getUnsafeInternalClient();
      jest.mocked(internalClient.asScopedToNamespace).mockReturnValue(namespacedClient);
      savedObjects.getUnsafeInternalClient.mockReturnValue(internalClient);
      const start = container.get(AlertingStartToken);

      const result = await start.disableRulesAsInternalUser({
        spaceId: asSpaceId('my-space'),
        ids: ['rule-1'],
      });

      expect(result).toEqual({ affected_count: 1, errors: [] });
      expect(mockRulesClient.bulkDisableRules).toHaveBeenCalledWith({ ids: ['rule-1'] });
      expect(savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
        includedHiddenTypes: ['alerting_rule'],
      });
      expect(internalClient.asScopedToNamespace).toHaveBeenCalledWith('my-space');
      expect(scope.get(RuleSavedObjectsClientToken)).toBe(namespacedClient);
      expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
      expect(scope.get(Request).headers.authorization).toBeUndefined();
    });

    it('uses the internal client as-is for the default space', async () => {
      const internalClient = savedObjects.getUnsafeInternalClient();
      savedObjects.getUnsafeInternalClient.mockReturnValue(internalClient);
      const start = container.get(AlertingStartToken);

      await start.disableRulesAsInternalUser({ spaceId: asSpaceId('default'), ids: ['rule-1'] });

      expect(internalClient.asScopedToNamespace).not.toHaveBeenCalled();
      expect(scope.get(RuleSavedObjectsClientToken)).toBe(internalClient);
    });
  });
});
