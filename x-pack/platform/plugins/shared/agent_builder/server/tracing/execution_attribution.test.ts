/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import {
  EXECUTION_ATTRIBUTION as ATTR,
  getExecutionAttribution,
  captureExecutionAttribution,
  restoreExecutionAttribution,
} from './execution_attribution';
import { DISABLED_TRACING_SETTINGS } from './privacy_settings';

describe('getExecutionAttribution', () => {
  const create = (fake = false) => {
    const security = securityServiceMock.createStart();
    security.authc.getPrincipal.mockReturnValue(null);
    security.authc.getCurrentUser.mockReturnValue(null);
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey never-export-this-secret' },
    });
    if (fake) Object.defineProperty(request, 'isFakeRequest', { value: true });
    return { request, security };
  };

  it('records a trusted request actor without claiming delegation or downstream credentials', () => {
    const deps = create();
    deps.security.authc.getPrincipal.mockReturnValue({
      type: 'user',
      userProfileId: 'profile-alice',
      username: 'alice',
    });
    const attribution = getExecutionAttribution(deps);
    expect(attribution.initiatingActor).toEqual({ id: 'profile-alice', username: 'alice' });
    expect(attribution.attributes).toEqual({
      [ATTR.status]: 'partial',
      [ATTR.source]: 'kibana_authc',
      [ATTR.capturePoint]: 'execution',
      [ATTR.callerType]: 'user',
      [ATTR.callerId]: 'profile-alice',
      [ATTR.callerName]: 'alice',
      [ATTR.actorId]: 'profile-alice',
      [ATTR.actorName]: 'alice',
      [ATTR.actorSource]: 'kibana_authc',
      [ATTR.delegationStatus]: 'unknown',
      [ATTR.downstreamCredentialStatus]: 'unknown',
    });
  });

  it('exports only the confirmed key identifier and never treats its owner as initiator', () => {
    const deps = create();
    deps.security.authc.getPrincipal.mockReturnValue({
      type: 'api_key',
      apiKeyId: 'opaque-key-id',
      variant: 'stack',
    });
    deps.security.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({ username: 'key-owner' })
    );
    const attribution = getExecutionAttribution(deps);
    expect(attribution.attributes[ATTR.callerType]).toBe('api_key');
    expect(attribution.attributes[ATTR.apiKeyId]).toBe('opaque-key-id');
    expect(attribution.initiatingActor).toBeUndefined();
    expect(JSON.stringify(attribution)).not.toContain('key-owner');
    expect(JSON.stringify(attribution)).not.toContain('never-export-this-secret');
    expect(deps.security.authc.getCurrentUser).not.toHaveBeenCalled();
  });

  it('does not parse request credentials when no trusted principal is available', () => {
    const attribution = getExecutionAttribution(create());
    expect(attribution.attributes[ATTR.status]).toBe('unavailable');
    expect(attribution.attributes[ATTR.apiKeyId]).toBeUndefined();
    expect(attribution.initiatingActor).toBeUndefined();
    expect(JSON.stringify(attribution)).not.toContain('never-export-this-secret');
  });

  it('keeps task user scope separate from an unproven initiator and unknown task credential', () => {
    const deps = create(true);
    deps.security.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({
        username: 'originating-user',
        profile_uid: 'profile-origin',
        authentication_type: undefined,
        authentication_provider: undefined,
      })
    );
    const attribution = getExecutionAttribution(deps);
    expect(attribution.attributes[ATTR.status]).toBe('partial');
    expect(attribution.attributes[ATTR.requestUserScopeId]).toBe('profile-origin');
    expect(attribution.attributes[ATTR.requestUserScopeName]).toBe('originating-user');
    expect(attribution.attributes[ATTR.actorSource]).toBeUndefined();
    expect(attribution.attributes[ATTR.actorId]).toBeUndefined();
    expect(attribution.initiatingActor).toBeUndefined();
    expect(attribution.attributes[ATTR.callerType]).toBeUndefined();
    expect(attribution.attributes[ATTR.apiKeyId]).toBeUndefined();
  });

  it('leaves unattributed task requests unavailable without reading their headers', () => {
    const attribution = getExecutionAttribution(create(true));
    expect(attribution.attributes[ATTR.status]).toBe('unavailable');
    expect(attribution.initiatingActor).toBeUndefined();
    expect(attribution.attributes[ATTR.apiKeyId]).toBeUndefined();
  });

  it('does not reinterpret a service account on a fake request as an originating user', () => {
    const deps = create(true);
    deps.security.authc.getPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'elastic/automation',
      variant: 'stack',
    });
    deps.security.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({
        username: 'elastic/automation',
        authentication_type: 'token',
      })
    );
    const attribution = getExecutionAttribution(deps);
    expect(attribution.attributes[ATTR.callerType]).toBe('service_account');
    expect(attribution.attributes[ATTR.callerId]).toBe('elastic/automation');
    expect(attribution.initiatingActor).toBeUndefined();
  });

  it('does not capture or inspect identity when tracing is disabled', () => {
    const deps = create();
    expect(
      captureExecutionAttribution({ ...deps, settings: DISABLED_TRACING_SETTINGS })
    ).toBeUndefined();
    expect(deps.security.authc.getPrincipal).not.toHaveBeenCalled();
  });

  it('applies privacy before storing request attribution and restores explicit pseudonyms', () => {
    const deps = create();
    deps.security.authc.getPrincipal.mockReturnValue({
      type: 'user',
      userProfileId: 'private-profile',
      username: 'private-name',
    });
    const snapshot = captureExecutionAttribution({
      ...deps,
      settings: { ...DISABLED_TRACING_SETTINGS, enabled: true },
    });
    expect(snapshot?.[ATTR.capturePoint]).toBe('request');
    expect(snapshot?.[ATTR.callerId]).toBeUndefined();
    expect(snapshot?.[ATTR.callerName]).toBeUndefined();
    expect(snapshot?.[ATTR.actorId]).toBeUndefined();
    expect(snapshot?.[ATTR.actorName]).toBeUndefined();
    expect(snapshot?.[ATTR.actorHash]).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(snapshot)).not.toContain('private-');
    const restored = restoreExecutionAttribution(snapshot ?? {});
    expect(restored.attributes).toEqual(snapshot);
    expect(restored.initiatingActor).toBeUndefined();
  });

  it('restores only known attribution fields, excluding arbitrary credential-shaped properties', () => {
    const restored = restoreExecutionAttribution({
      [ATTR.callerType]: 'api_key',
      [ATTR.apiKeyId]: 'confirmed-id',
      authorization: 'ApiKey secret',
      password: 'secret',
      connector_secret: 'secret',
    });
    expect(restored.attributes).toEqual({
      [ATTR.callerType]: 'api_key',
      [ATTR.apiKeyId]: 'confirmed-id',
    });
    expect(restored.initiatingActor).toBeUndefined();
  });

  it('does not label anonymous access as an initiating user', () => {
    const deps = create();
    deps.security.authc.getPrincipal.mockReturnValue({ type: 'anonymous', username: 'anonymous' });
    const attribution = getExecutionAttribution(deps);
    expect(attribution.attributes[ATTR.callerType]).toBe('anonymous');
    expect(attribution.initiatingActor).toBeUndefined();
  });
});
