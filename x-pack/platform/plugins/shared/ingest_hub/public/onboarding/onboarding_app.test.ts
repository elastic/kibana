/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldClearSession, hydrateOnboardingSession } from './onboarding_app';

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendGetCloudOnboardingDeployment: jest.fn(),
}));

import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';

const mockSendGet = sendGetCloudOnboardingDeployment as jest.Mock;

describe('hydrateOnboardingSession', () => {
  const INTEGRATION_ID = 'aws';
  const DEPLOYMENT_ID = 'dep-test-001';

  const makeItem = (overrides = {}) => ({
    id: DEPLOYMENT_ID,
    provider: 'aws',
    services: ['elb'],
    dataFormat: 'ecs',
    globalRegion: 'us-east-1',
    serviceVars: {},
    connectorId: 'connector-123',
    ...overrides,
  });

  beforeEach(() => {
    sessionStorage.clear();
    mockSendGet.mockReset();
  });

  it('returns true and writes session storage on success', async () => {
    mockSendGet.mockResolvedValue({ item: makeItem() });
    const result = await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    expect(result).toBe(true);
    expect(sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.servicesStep`)).not.toBeNull();
    expect(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.detectAndReviewStep`)
    ).not.toBeNull();
  });

  it('returns false and does not write session storage when fetch fails', async () => {
    mockSendGet.mockRejectedValue(new Error('network error'));
    const result = await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    expect(result).toBe(false);
    expect(sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.servicesStep`)).toBeNull();
  });

  it('caller must not write hydratedDeploymentId when hydration returns false — retry is possible on next reload', async () => {
    // Simulate the guard logic in renderOnboardingApp.
    mockSendGet.mockRejectedValue(new Error('500'));
    const hydratedKey = `onboarding.${INTEGRATION_ID}.hydratedDeploymentId`;
    const hydrated = await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    if (hydrated) sessionStorage.setItem(hydratedKey, DEPLOYMENT_ID);
    expect(sessionStorage.getItem(hydratedKey)).toBeNull();

    // On next reload, hydration would be retried (key still absent).
    mockSendGet.mockResolvedValue({ item: makeItem() });
    const hydrated2 = await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    if (hydrated2) sessionStorage.setItem(hydratedKey, DEPLOYMENT_ID);
    expect(sessionStorage.getItem(hydratedKey)).toBe(DEPLOYMENT_ID);
  });

  it('writes authMethod: identity_federation for connector deployments', async () => {
    mockSendGet.mockResolvedValue({ item: makeItem({ connectorId: 'c-abc' }) });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const auth = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.authenticateAndDeployStep`) ?? 'null'
    );
    expect(auth?.authMethod).toBe('identity_federation');
    expect(auth?.connectorId).toBe('c-abc');
  });

  it('writes authMethod: static_keys for deployments without connectorId', async () => {
    mockSendGet.mockResolvedValue({ item: makeItem({ connectorId: undefined }) });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const auth = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.authenticateAndDeployStep`) ?? 'null'
    );
    expect(auth?.authMethod).toBe('static_keys');
    expect(auth?.connectorId).toBeUndefined();
  });
});

describe('shouldClearSession', () => {
  const tileEntry = (overrides: { pathname?: string; search?: string; state?: unknown } = {}) => ({
    pathname: '/aws',
    search: '',
    state: { newSession: true },
    ...overrides,
  });

  it('returns the integration id on tile entry — integration id + newSession flag, no deploymentId', () => {
    expect(shouldClearSession(tileEntry())).toBe('aws');
  });

  it('returns null after flag is consumed — reload has no newSession flag', () => {
    expect(shouldClearSession(tileEntry({ state: undefined }))).toBeNull();
  });

  it('returns null when newSession is false', () => {
    expect(shouldClearSession(tileEntry({ state: { newSession: false } }))).toBeNull();
  });

  it('returns null when pathname has no integration id (root redirect)', () => {
    expect(shouldClearSession(tileEntry({ pathname: '/' }))).toBeNull();
  });

  it('defers to hydration path when ?deploymentId is present', () => {
    expect(shouldClearSession(tileEntry({ search: '?deploymentId=abc' }))).toBeNull();
  });

  it('returns the integration id when other query params are present but deploymentId is not', () => {
    expect(shouldClearSession(tileEntry({ search: '?foo=bar' }))).toBe('aws');
  });
});
