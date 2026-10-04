/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockFinalAnswer, mockTitleGeneration } from '../../common/llm_mocks';
import { mockUpdatePanelToolCall } from '../fixtures/llm_mocks';

const DASHBOARD_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

const refineWithChatRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        agentBuilder: ['all'],
        dashboard_v2: ['all'],
        actions: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

test.describe('Custom content panel Refine with chat', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(DASHBOARD_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(refineWithChatRole);
    await pageObjects.dashboard.openNewDashboard();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(DASHBOARD_ARCHIVE);
  });

  test('applies the agent update to the open panel', async ({ pageObjects, llmProxy }) => {
    const { dashboard, customContentPanel } = pageObjects;

    await dashboard.openAddPanelFlyout();
    await customContentPanel.openFromAddPanelFlyout();
    await customContentPanel.setTemplate('<p id="greeting">{{ rows[0]["greeting"].value }}</p>');
    await customContentPanel.setEsqlQuery('ROW greeting = "hello"');
    await customContentPanel.applyAndClose();

    const iframe = customContentPanel.getPanelIframe();
    await expect(iframe.getByText('hello', { exact: true })).toBeVisible();

    mockTitleGeneration(llmProxy, 'Refine custom panel');
    mockUpdatePanelToolCall(llmProxy, 'ROW greeting = "refined"');
    mockFinalAnswer(llmProxy, 'I updated the panel.');

    await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
    await customContentPanel.refineWithChatButton.click();
    await customContentPanel.sendChatMessage('Change the greeting');

    await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
    await expect(iframe.getByText('refined', { exact: true })).toBeVisible();
  });
});
