/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCloudService, shouldClearSession, hydrateOnboardingSession } from './onboarding_app';

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

  // §0.1 — Guard: agent-based hydration must NOT seed agentPolicyId (singular).
  // If it does, handleDeploy's "agentPolicyId ? [agentPolicyId] : selectedAgentPolicyIds" ternary
  // narrows a multi-policy resume to the first policy only. It also makes isPolicyCreated truthy,
  // re-opening the credential-gate bug that §A fixes via the isNextReady isPolicyCreated branch.
  it('agent-based resume with policies: sets agentHostsMode:existing, selectedAgentPolicyIds, agentCredentialMethod — never agentPolicyId', async () => {
    mockSendGet.mockResolvedValue({
      item: makeItem({
        connectorId: undefined,
        mechanisms: ['agent_based'],
        agentPolicyIds: ['policy-a', 'policy-b'],
        authMethod: 'assume_role',
      }),
    });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const auth = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.authenticateAndDeployStep`) ?? 'null'
    );
    expect(auth).toMatchObject({
      deploymentMethod: 'agent_based',
      agentHostsMode: 'existing',
      selectedAgentPolicyIds: ['policy-a', 'policy-b'],
      agentCredentialMethod: 'assume_role',
    });
    // Regression guard: singular agentPolicyId must NOT be seeded.
    expect(auth).not.toHaveProperty('agentPolicyId');
  });

  it('agent-based resume with no policies: sets agentHostsMode:new', async () => {
    mockSendGet.mockResolvedValue({
      item: makeItem({
        connectorId: undefined,
        mechanisms: ['agent_based'],
        agentPolicyIds: [],
        authMethod: 'static_keys',
      }),
    });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const auth = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.authenticateAndDeployStep`) ?? 'null'
    );
    expect(auth).toMatchObject({ deploymentMethod: 'agent_based', agentHostsMode: 'new' });
    expect(auth).not.toHaveProperty('agentPolicyId');
  });

  // §0.2 — Guard: policyIdsByInstance must be empty for non-succeeded deploys.
  // Fabricating completion for services that failed would prevent the retry path from running.
  it('agent-based resume with status:succeeded populates policyIdsByInstance', async () => {
    mockSendGet.mockResolvedValue({
      item: makeItem({
        connectorId: undefined,
        mechanisms: ['agent_based'],
        status: 'succeeded',
        services: ['aws.cloudtrail', 'aws.vpcflow'],
        packagePolicyIds: ['pkg-1', 'pkg-2'],
      }),
    });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const review = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.detectAndReviewStep`) ?? 'null'
    );
    expect(review?.policyIdsByInstance).toMatchObject({
      'aws.cloudtrail': expect.any(String),
      'aws.vpcflow': expect.any(String),
    });
  });

  it('agent-based resume with status:failed leaves policyIdsByInstance empty', async () => {
    mockSendGet.mockResolvedValue({
      item: makeItem({
        connectorId: undefined,
        mechanisms: ['agent_based'],
        status: 'failed',
        services: ['aws.cloudtrail'],
        packagePolicyIds: ['pkg-1'],
      }),
    });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const review = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.detectAndReviewStep`) ?? 'null'
    );
    expect(review?.policyIdsByInstance).toEqual({});
  });

  it('restores ecfStacks into detectAndReviewStep so isMethodLocked stays true on ECF resume', async () => {
    const ecfStacks = [{ stackName: 'my-stack', region: 'us-east-1', status: 'CREATE_COMPLETE' }];
    mockSendGet.mockResolvedValue({ item: makeItem({ ecfStacks }) });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const detect = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.detectAndReviewStep`) ?? 'null'
    );
    expect(detect?.ecfStacks).toEqual(ecfStacks);
  });

  it('omits ecfStacks from detectAndReviewStep when item has none', async () => {
    mockSendGet.mockResolvedValue({ item: makeItem({ ecfStacks: undefined }) });
    await hydrateOnboardingSession(INTEGRATION_ID, DEPLOYMENT_ID);
    const detect = JSON.parse(
      sessionStorage.getItem(`onboarding.${INTEGRATION_ID}.detectAndReviewStep`) ?? 'null'
    );
    expect(detect?.ecfStacks).toBeUndefined();
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

describe('getCloudService', () => {
  const cloudSetup = {
    isCloudEnabled: true,
    isServerlessEnabled: false,
    organizationId: '2070044029',
    csp: 'aws',
    region: 'eu-west-1',
    cloudHost: 'eu-west-1.aws.qa.cld.elstc.co',
    serverless: {},
  } as any;
  const cloudStart = {
    isCloudEnabled: true,
    isServerlessEnabled: false,
    cloudId: 'qa:abc',
    deploymentUrl: 'https://console.qa.cld.elstc.co/deployments/1f2e3d4c',
    serverless: {},
  } as any;

  it('returns undefined when the cloud plugin is not available', () => {
    expect(getCloudService(undefined, undefined)).toBeUndefined();
    expect(getCloudService(cloudSetup, undefined)).toBeUndefined();
  });

  it('exposes the setup-only deployment metadata alongside the start contract', () => {
    const cloud = getCloudService(cloudSetup, cloudStart);
    expect(cloud).toMatchObject({
      organizationId: '2070044029',
      csp: 'aws',
      region: 'eu-west-1',
      cloudHost: 'eu-west-1.aws.qa.cld.elstc.co',
      cloudId: 'qa:abc',
      deploymentUrl: 'https://console.qa.cld.elstc.co/deployments/1f2e3d4c',
    });
  });

  it('lets the start contract win on shared keys', () => {
    const cloud = getCloudService({ ...cloudSetup, cloudId: 'stale' }, cloudStart);
    expect(cloud?.cloudId).toBe('qa:abc');
  });

  it('works without a setup contract', () => {
    expect(getCloudService(undefined, cloudStart)).toEqual(cloudStart);
  });
});
