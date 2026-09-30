/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import type { ServiceToken } from '@kbn/core-di';
import { Setup, Start } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { RulesClient } from '../lib/rules_client';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { AlertEventsClient } from '../lib/alert_events_client';
import { ArtifactTypeRegistry } from '../lib/artifact_types';
import { BuilderTypeRegistry } from '../lib/builder_types';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';
import { CallerIdentityToken } from '../lib/rules_client/caller_identity';
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

  beforeEach(() => {
    container = new Container();
    scope = new Container();
    mockRulesClient = { getRule: jest.fn() };
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
    container.bind(BuilderTypeRegistry).toSelf().inSingletonScope();

    container.load(new ContainerModule((options) => bindContract(options)));
  });

  it('exposes registerArtifactType and registerBuilderType on the setup contract', () => {
    const setup = container.get(AlertingSetupToken);
    expect(setup).toEqual({
      registerArtifactType: expect.any(Function),
      registerBuilderType: expect.any(Function),
    });
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

  // ---------------------------------------------------------------------------
  // Step 5.1: caller identity is bound into the scope when onBehalfOf is given
  //
  // The design guarantees: the framework's own HTTP routes resolve a client
  // with nothing bound, so the generic API surface is identity-less. In-process
  // callers pass onBehalfOf and have it bound in the request scope.
  //
  // Ref: rule-ownership.md "Caller identity"
  // ---------------------------------------------------------------------------

  describe('caller identity (step 5.1)', () => {
    it('binds onBehalfOf into the scope when getRulesClientWithRequest is called with options', async () => {
      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const start = container.get(AlertingStartToken);

      const identity = { solution: 'security', app: 'detections' };
      await start.getRulesClientWithRequest(fakeRequest, { onBehalfOf: identity });

      expect(scope.get(CallerIdentityToken)).toEqual(identity);
    });

    it('does not bind CallerIdentityToken when getRulesClientWithRequest is called without options', async () => {
      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const start = container.get(AlertingStartToken);

      // No options — simulates a framework HTTP route resolving its client.
      await start.getRulesClientWithRequest(fakeRequest);

      // CallerIdentityToken must not have been bound into the scope.
      expect(() => scope.get(CallerIdentityToken)).toThrow();
    });

    it('binds onBehalfOf into the scope when getRulesClientWithRequestInSpace is called with options', async () => {
      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const start = container.get(AlertingStartToken);

      const identity = { solution: 'security' };
      await start.getRulesClientWithRequestInSpace(fakeRequest, asSpaceId('my-space'), {
        onBehalfOf: identity,
      });

      expect(scope.get(CallerIdentityToken)).toEqual(identity);
      expect(scope.get(RequestSpaceIdToken)).toBe('my-space');
    });

    it('does not bind CallerIdentityToken when getRulesClientWithRequestInSpace is called without options', async () => {
      const fakeRequest = { headers: {} } as unknown as KibanaRequest;
      const start = container.get(AlertingStartToken);

      await start.getRulesClientWithRequestInSpace(fakeRequest, asSpaceId('my-space'));

      expect(() => scope.get(CallerIdentityToken)).toThrow();
    });
  });
});
