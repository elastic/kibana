/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScoutPage,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutWorkerFixtures,
  BrowserAuthFixture,
  ScoutTestFixtures,
  KibanaRole,
} from '@kbn/scout';
import { test as baseTest, spaceTest as spaceBaseTest } from '@kbn/scout';

import type { GenAiSettingsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

/**
 * Role definition for a user without Agent Builder privileges.
 * Has AI Assistants (Observability & Security) but no Agent Builder.
 */
const getAgentBuilderNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        securitySolutionAssistant: ['all'],
        actions: ['all'],
        observabilityAIAssistant: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for a user without AI Assistants privileges.
 * Has Agent Builder but no AI Assistants (Observability & Security).
 */
const getAIAssistantsNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        agentBuilder: ['all'],
        actions: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Extended browser auth fixture with custom login methods
 */
export interface GenAiSettingsBrowserAuthFixture extends BrowserAuthFixture {
  loginAsNonAgentBuilderUser: () => Promise<void>;
  loginAsNonAssistantUser: () => Promise<void>;
}

export interface GenAiSettingsTestFixtures extends ScoutTestFixtures {
  pageObjects: GenAiSettingsPageObjects;
  browserAuth: GenAiSettingsBrowserAuthFixture;
}

export interface GenAiSettingsParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: GenAiSettingsPageObjects;
  browserAuth: GenAiSettingsBrowserAuthFixture;
}

export const test = baseTest.extend<GenAiSettingsTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: GenAiSettingsPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: GenAiSettingsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: GenAiSettingsBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsNonAgentBuilderUser = async () =>
      browserAuth.loginWithCustomRole(getAgentBuilderNoneRole());
    const loginAsNonAssistantUser = async () =>
      browserAuth.loginWithCustomRole(getAIAssistantsNoneRole());

    await use({
      ...browserAuth,
      loginAsNonAgentBuilderUser,
      loginAsNonAssistantUser,
    });
  },
});

export const spaceTest = spaceBaseTest.extend<
  GenAiSettingsParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: GenAiSettingsBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsNonAgentBuilderUser = async () =>
      browserAuth.loginWithCustomRole(getAgentBuilderNoneRole());
    const loginAsNonAssistantUser = async () =>
      browserAuth.loginWithCustomRole(getAIAssistantsNoneRole());

    await use({
      ...browserAuth,
      loginAsNonAgentBuilderUser,
      loginAsNonAssistantUser,
    });
  },
});
