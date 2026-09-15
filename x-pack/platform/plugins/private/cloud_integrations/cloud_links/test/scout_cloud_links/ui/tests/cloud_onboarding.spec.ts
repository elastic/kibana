/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaUrl, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { CLOUD_SOLUTION_HEADERS } from '../fixtures/constants';

// Fetches the current onboarding state saved by the cloud onboarding route
const getOnboardingState = async (page: ScoutPage, kbnUrl: KibanaUrl) => {
  const response = await page.request.get(kbnUrl.get('/internal/cloud/solution'), {
    headers: CLOUD_SOLUTION_HEADERS,
  });
  expect(response.status()).toBe(200);
  return response.json();
};

test.describe('Cloud onboarding', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ uiSettings }) => {
    // The onboarding route reads 'defaultRoute' via uiSettings.client (space-level setting).
    // Set it to a known path so the "no token" redirect assertion is deterministic.
    await uiSettings.set({ defaultRoute: '/app/observability/landing' });
  });

  // Uses kbnClient (superuser via FTR internal routes) to reliably delete the hidden 'cloud' SO type.
  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['cloud'] });
  });

  test.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('defaultRoute');
  });

  test('redirect with no token goes to the default route', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.cloudOnboarding.navigateWithParams({});

    const pathname = await pageObjects.cloudOnboarding.getCurrentPathname();
    expect(pathname).toBe('/app/observability/landing');
  });

  test('redirect saves and updates onboarding token and security details', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();

    const securityDetails = '{"use_case":"siem","migration":{"value":true,"type":"splunk"}}';

    await test.step('saves token and security details on first visit', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        token: 'security',
        securityDetails,
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      expect(await pageObjects.cloudOnboarding.getCurrentPathname()).toBe(
        '/app/security/get_started'
      );
      expect(await pageObjects.cloudOnboarding.getCurrentHash()).toBe('#some=hash-value');

      const { onboardingData } = await getOnboardingState(page, kbnUrl);
      expect(onboardingData).toStrictEqual({
        token: 'security',
        security: { useCase: 'siem', migration: { value: true, type: 'splunk' } },
      });
    });

    await test.step('updates security details on second visit', async () => {
      const updatedDetails = '{"use_case":"cloud","migration":{"value":true,"type":"other"}}';
      await pageObjects.cloudOnboarding.navigateWithParams({
        token: 'security',
        securityDetails: updatedDetails,
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const { onboardingData } = await getOnboardingState(page, kbnUrl);
      expect(onboardingData).toStrictEqual({
        token: 'security',
        security: { useCase: 'cloud', migration: { value: true, type: 'other' } },
      });
    });
  });

  test('redirect saves and updates resource data', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();

    await test.step('saves resource data on first visit', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        token: 'vector',
        resourceData: '{"project":{"search":{"type":"vector"}}}',
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const state = await getOnboardingState(page, kbnUrl);
      expect(state.onboardingData).toStrictEqual({ token: 'vector' });
      expect(state.resourceData).toStrictEqual({ project: { search: { type: 'vector' } } });
    });

    await test.step('updates resource data on second visit and preserves token', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        resourceData: '{"project":{"search":{"type":"general"}}}',
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const state = await getOnboardingState(page, kbnUrl);
      expect(state.onboardingData).toStrictEqual({ token: 'vector' });
      expect(state.resourceData).toStrictEqual({ project: { search: { type: 'general' } } });
    });
  });

  test('redirect saves and updates deployment resource data', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();

    await test.step('saves deployment data on first visit', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        token: 'vector',
        resourceData: '{"deployment":{"id":"deployment-id","name":"deployment-name"}}',
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const state = await getOnboardingState(page, kbnUrl);
      expect(state.onboardingData).toStrictEqual({ token: 'vector' });
      expect(state.resourceData).toStrictEqual({
        deployment: { id: 'deployment-id', name: 'deployment-name' },
      });
    });

    await test.step('updates deployment data on second visit and preserves token', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        resourceData: '{"deployment":{"id":"new-deployment-id","name":"new-deployment-name"}}',
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const state = await getOnboardingState(page, kbnUrl);
      expect(state.onboardingData).toStrictEqual({ token: 'vector' });
      expect(state.resourceData).toStrictEqual({
        deployment: { id: 'new-deployment-id', name: 'new-deployment-name' },
      });
    });
  });

  test('keeps initial onboarding token when not provided on update', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();

    const securityDetails = '{"use_case":"siem","migration":{"value":true,"type":"splunk"}}';

    await test.step('saves token and security details on first visit', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        token: 'security',
        securityDetails,
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const { onboardingData } = await getOnboardingState(page, kbnUrl);
      expect(onboardingData).toStrictEqual({
        token: 'security',
        security: { useCase: 'siem', migration: { value: true, type: 'splunk' } },
      });
    });

    await test.step('preserves token on second visit when onboarding_token is omitted', async () => {
      await pageObjects.cloudOnboarding.navigateWithParams({
        securityDetails,
        next: '/app/security/get_started',
        hash: '#some=hash-value',
      });

      const { onboardingData } = await getOnboardingState(page, kbnUrl);
      expect(onboardingData).toStrictEqual({
        token: 'security',
        security: { useCase: 'siem', migration: { value: true, type: 'splunk' } },
      });
    });
  });
});
