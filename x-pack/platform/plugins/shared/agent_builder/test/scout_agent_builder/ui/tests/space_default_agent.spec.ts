/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import {
  COMMON_HEADERS,
  INTERNAL_AGENT_BUILDER,
} from '../../../scout_agent_builder_shared/lib/constants';
import { agentBuilderRole } from '../../../scout_agent_builder_shared/lib/roles';
import { test } from '../fixtures';

const DEFAULT_AGENT = { id: 'space-default-agent-7f3a', name: 'Space Default Agent 7f3a' };
const OTHER_AGENT = { id: 'space-other-agent-7f3a', name: 'Space Other Agent 7f3a' };

// A read-only user: has the base Agent Builder read privilege but NOT the
// `manage_agents` sub-feature, so they are the "restricted" persona the feature
// pins to a single agent. `spaces: ['*']` keeps the role valid in the default
// space these UI tests run in.
const READ_ONLY_ROLE = agentBuilderRole('*', ['minimal_read']);

// Set or clear the space default via the internal API as the (superuser)
// kbnClient. Used to arrange the "a default is configured" precondition
// deterministically, so the browser test only performs one login per persona.
async function setSpaceDefaultAgentViaApi(kbnClient: KbnClient, defaultAgentId: string | null) {
  await kbnClient.request({
    method: 'PUT',
    path: `${INTERNAL_AGENT_BUILDER}/space_settings`,
    headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
    body: { default_agent_id: defaultAgentId },
  });
}

test.describe(
  'Agent Builder — per-space default agent',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      // createAgentViaKbn deletes-then-creates by id, so no index-wide wipe is
      // needed — this keeps the spec from deleting agents other specs seeded.
      await createAgentViaKbn(kbnClient, {
        id: DEFAULT_AGENT.id,
        name: DEFAULT_AGENT.name,
        accessMode: AgentAccessControlMode.Public,
      });
      await createAgentViaKbn(kbnClient, {
        id: OTHER_AGENT.id,
        name: OTHER_AGENT.name,
        accessMode: AgentAccessControlMode.Public,
      });
    });

    test.afterEach(async ({ kbnClient }) => {
      // Reset so the assignment does not leak between tests.
      await setSpaceDefaultAgentViaApi(kbnClient, null);
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      // afterEach already clears the space default; here we only remove this
      // spec's own agents (by id) and conversations.
      for (const id of [DEFAULT_AGENT.id, OTHER_AGENT.id]) {
        try {
          await deleteAgentViaKbn(kbnClient, id);
        } catch {
          // ignore — a test may have removed it already
        }
      }
      await deleteAllConversationsFromEs(esClient);
    });

    test('admin sets and clears the space default from the agents list', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.agentBuilder.navigateToApp('manage/agents');
      await pageObjects.agentBuilder.agentExistsOrFail(DEFAULT_AGENT.id);

      const toggleSpaceDefault = () =>
        pageObjects.agentBuilder.agentAction(
          DEFAULT_AGENT.id,
          `agentBuilderAgentsListSpaceDefault-${DEFAULT_AGENT.id}`
        );
      const badge = page.testSubj.locator('agentBuilderAgentsListSpaceDefaultBadge');

      await test.step('"Set as space default" shows the Space default badge', async () => {
        await toggleSpaceDefault().click();
        await expect(badge).toBeVisible({ timeout: 30_000 });
      });

      await test.step('"Remove as space default" hides the badge', async () => {
        await toggleSpaceDefault().click();
        await expect(badge).toHaveCount(0, { timeout: 30_000 });
      });
    });

    test('restricts a non-admin to the space default agent', async ({
      page,
      pageObjects,
      browserAuth,
      kbnClient,
    }) => {
      await setSpaceDefaultAgentViaApi(kbnClient, DEFAULT_AGENT.id);
      await browserAuth.loginWithCustomRole(READ_ONLY_ROLE);

      const defaultAgentUrl = new RegExp(`/agents/${DEFAULT_AGENT.id}`);

      await test.step('opening Agent Builder lands on the space default', async () => {
        await page.gotoApp('agent_builder');
        await expect(page).toHaveURL(defaultAgentUrl, { timeout: 60_000 });
      });

      await test.step('the sidebar selector exposes only the space default', async () => {
        const selectorButton = page.testSubj.locator('agentBuilderAgentSelectorButton');
        await expect(selectorButton).toContainText(DEFAULT_AGENT.name, { timeout: 60_000 });
        await selectorButton.click();
        // The default is present...
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${DEFAULT_AGENT.id}`)
        ).toBeVisible({ timeout: 30_000 });
        // ...and no other agent is offered.
        await expect(
          page.testSubj.locator(`agentBuilderAgentOption-${OTHER_AGENT.id}`)
        ).toHaveCount(0);
        await pageObjects.agentBuilder.dismissWithEscape();
      });

      await test.step('deep-linking to another agent redirects to the space default', async () => {
        await page.gotoApp(`agent_builder/agents/${OTHER_AGENT.id}/conversations/new`);
        await expect(page).toHaveURL(defaultAgentUrl, { timeout: 60_000 });
      });
    });

    test('admin still sees all agents when a space default is set', async ({
      page,
      pageObjects,
      browserAuth,
      kbnClient,
    }) => {
      await setSpaceDefaultAgentViaApi(kbnClient, DEFAULT_AGENT.id);
      await browserAuth.loginAsAdmin();
      await pageObjects.agentBuilder.navigateToApp(`agents/${DEFAULT_AGENT.id}/conversations/new`);

      await page.testSubj.locator('agentBuilderAgentSelectorButton').click();
      await expect(
        page.testSubj.locator(`agentBuilderAgentOption-${DEFAULT_AGENT.id}`)
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.testSubj.locator(`agentBuilderAgentOption-${OTHER_AGENT.id}`)).toBeVisible({
        timeout: 30_000,
      });
    });
  }
);
