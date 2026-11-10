/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRoleDescriptor, KibanaRole, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'];
const SOURCE_ID = 'otlp-input';
const SOURCE_NAME = 'OTLP';
const DESTINATION_ID = 'es-out';
const DESTINATION_NAME = 'Elasticsearch';
const EDGE_ID = `unit-connection-${SOURCE_ID}->${DESTINATION_ID}`;
const READ_ONLY_CALLOUT = 'streamsUnitReadOnlyCallout';

const kibanaRole = (feature: Record<string, string[]>, cluster: string[] = []): KibanaRole => ({
  elasticsearch: { cluster },
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

const V2_READ_ROLE = kibanaRole({ streamsV2: ['read'] });
const V2_ALL_ROLE = kibanaRole({ streamsV2: ['all'] });
const V2_ALL_WITH_MANAGE_OWN_API_KEY_ROLE = kibanaRole({ streamsV2: ['all'] }, [
  'manage_own_api_key',
]);
const LEGACY_READ_ROLE = kibanaRole({ streams: ['read'] });

/**
 * The non-admin V2 manager setup documented in the streams plugin DEVELOPMENT.md: a Kibana role
 * with Streams V2 `all` plus the `streams_v2_manager` Elasticsearch role. Scout gives each test
 * user exactly one role, so this merges both.
 */
const V2_MANAGER_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['manage_own_api_key'],
  indices: [
    {
      names: ['logs-*', 'metrics-*', 'traces-*'],
      privileges: [
        'read',
        'view_index_metadata',
        'monitor',
        'read_failure_store',
        'create_doc',
        'auto_configure',
      ],
    },
  ],
  applications: [
    { application: 'kibana-.kibana', privileges: ['feature_streamsV2.all'], resources: ['*'] },
    { application: 'streams', privileges: ['write'], resources: ['source:*'] },
  ],
};

/** The test stack runs no config distributor, so the map is served from a mocked unit. */
const MOCK_UNIT = {
  unit: {
    sources: [
      { id: SOURCE_ID, name: SOURCE_NAME, type: 'otlp', supported_telemetry: SUPPORTED_TELEMETRY },
    ],
    destinations: [
      {
        id: DESTINATION_ID,
        name: DESTINATION_NAME,
        type: 'elasticsearch',
        supported_telemetry: SUPPORTED_TELEMETRY,
      },
    ],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: SUPPORTED_TELEMETRY,
        config: [
          { name: 'sources', value: [SOURCE_ID] },
          { name: 'destinations', value: [DESTINATION_ID] },
        ],
      },
    ],
  },
  ui_metadata: {},
};

const mockUnit = async (page: ScoutPage) => {
  await page.route('**/internal/streams/unit/default', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_UNIT),
    });
  });
  await page.route('**/internal/streams/unit/*/_resolve_indices', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ destinations: {} }),
    });
  });
  await page.route('**/internal/streams/unit/*/_stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        components: { destinations: {}, processors: {} },
        meta: { window: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-01T00:15:00.000Z' } },
      }),
    });
  });
};

test.describe('Streams V2 privileges', { tag: tags.serverless.observability.complete }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true });
  });

  test.beforeEach(async ({ page }) => {
    await mockUnit(page);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({ [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false });
  });

  test('a V2-only read user gets the nav entry and lands on the map', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(V2_READ_ROLE);
    await page.gotoApp('streams');

    await expect(page).toHaveURL(/\/app\/streams\/v2\/unit\/default\/map/);
    await expect(pageObjects.streams.canvasTab).toBeVisible();
    await expect(pageObjects.collapsibleNav.getNavItemByDeepLinkId('streams')).toBeVisible();
    await expect(pageObjects.streams.getStreamsLayoutTab('classic')).toHaveCount(0);
  });

  test('a legacy-only read user is sent back from V2', async ({ browserAuth, page }) => {
    await browserAuth.loginWithCustomRole(LEGACY_READ_ROLE);
    await page.gotoApp('streams/v2/unit/default/map');

    await expect(page).not.toHaveURL(/\/app\/streams\/v2/);
    await expect(page.testSubj.locator('streamsCanvasTab')).toHaveCount(0);
  });

  test('V2 read: the map has no toolbar, context menus or line menus', async ({
    browserAuth,
    page,
    pageObjects: { streams },
  }) => {
    await browserAuth.loginWithCustomRole(V2_READ_ROLE);
    await streams.gotoStreamsLayoutTab('map');

    await expect(streams.canvasTab).toBeVisible();
    await expect(page.testSubj.locator(READ_ONLY_CALLOUT)).toBeVisible();
    await expect(streams.canvasToolbar).toHaveCount(0);

    await streams.rightClickCanvasPane();
    await expect(streams.canvasContextMenu).toHaveCount(0);

    await streams.rightClickCanvasNode(streams.getCanvasSourceNode(SOURCE_NAME));
    await expect(streams.canvasContextMenu).toHaveCount(0);

    await streams.hoverCanvasEdge(EDGE_ID);
    await expect(streams.canvasEdgeMenuButton).toHaveCount(0);
    await expect(streams.getCanvasEdgeReconnectAnchors(EDGE_ID)).toHaveCount(0);
  });

  test('V2 read: map flyouts hide API keys and deletion', async ({
    browserAuth,
    page,
    pageObjects: { streams },
  }) => {
    await browserAuth.loginWithCustomRole(V2_READ_ROLE);
    await streams.gotoStreamsLayoutTab('map');

    await streams.clickCanvasNode(streams.getCanvasSourceNode(SOURCE_NAME));
    const sourceFlyout = page.testSubj.locator('streamsSourceDetailsFlyout');
    await expect(sourceFlyout).toBeVisible();
    await expect(sourceFlyout.getByTestId('streamsSourceGenerateApiKeyButton')).toHaveCount(0);
    await expect(sourceFlyout.getByTestId('streamsSourceDeleteButton')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(sourceFlyout).toHaveCount(0);

    await streams.clickCanvasNode(streams.getCanvasDestinationNode(DESTINATION_NAME));
    const destinationFlyout = page.testSubj.locator('streamsUnitDestinationFlyout');
    await expect(destinationFlyout).toBeVisible();
    await expect(destinationFlyout.getByTestId('streamsDeleteDestinationButton')).toHaveCount(0);
  });

  test('V2 read: the tables hide add and delete actions', async ({
    browserAuth,
    page,
    pageObjects: { streams },
  }) => {
    await browserAuth.loginWithCustomRole(V2_READ_ROLE);

    await streams.gotoStreamsLayoutTab('sources');
    await expect(streams.streamsSourcesTable).toBeVisible();
    await expect(page.testSubj.locator(READ_ONLY_CALLOUT)).toBeVisible();
    await expect(streams.streamsAddSourceButton).toHaveCount(0);
    await expect(
      streams.streamsSourcesTable.getByTestId('streamsShowOnCanvasAction')
    ).toBeVisible();
    await expect(
      streams.streamsSourcesTable.getByTestId('streamsSourceRowActionsButton')
    ).toHaveCount(0);

    await streams.gotoStreamsLayoutTab('destinations');
    await expect(streams.streamsDestinationsTable).toBeVisible();
    await expect(page.testSubj.locator(READ_ONLY_CALLOUT)).toBeVisible();
    await expect(page.testSubj.locator('streamsAddDestinationButton')).toHaveCount(0);
    await expect(streams.getDestinationShowOnCanvasButton(DESTINATION_NAME)).toBeVisible();
    await expect(
      streams.streamsDestinationsTable.getByTestId('streamsDestinationRowActionsButton')
    ).toHaveCount(0);
  });

  test('V2 all: the map, flyouts and tables are editable', async ({
    browserAuth,
    page,
    pageObjects: { streams },
  }) => {
    await browserAuth.loginWithCustomRole(V2_ALL_ROLE);
    await streams.gotoStreamsLayoutTab('map');

    await expect(streams.canvasToolbar).toBeVisible();
    await expect(page.testSubj.locator(READ_ONLY_CALLOUT)).toHaveCount(0);

    await streams.openCanvasPaneContextMenu();
    await page.keyboard.press('Escape');
    await expect(streams.canvasContextMenu).toHaveCount(0);

    await expect(streams.getCanvasEdgeReconnectAnchors(EDGE_ID)).not.toHaveCount(0);
    await streams.openCanvasEdgeMenu(EDGE_ID);
    await expect(page.testSubj.locator('streamsCanvasEdgeMenu')).toBeVisible();
    await page.keyboard.press('Escape');

    await streams.clickCanvasNode(streams.getCanvasDestinationNode(DESTINATION_NAME));
    await expect(
      page.testSubj
        .locator('streamsUnitDestinationFlyout')
        .getByTestId('streamsDeleteDestinationButton')
    ).toBeVisible();

    await streams.gotoStreamsLayoutTab('sources');
    await expect(streams.streamsAddSourceButton).toBeVisible();
    await expect(
      streams.streamsSourcesTable.getByTestId('streamsSourceRowActionsButton')
    ).toBeVisible();

    await streams.gotoStreamsLayoutTab('destinations');
    await expect(page.testSubj.locator('streamsAddDestinationButton')).toBeVisible();
    await expect(
      streams.streamsDestinationsTable.getByTestId('streamsDestinationRowActionsButton')
    ).toBeVisible();
  });

  test('V2 all without manage_own_api_key: key generation is disabled and says why', async ({
    browserAuth,
    page,
    pageObjects: { streams },
  }) => {
    await browserAuth.loginWithCustomRole(V2_ALL_ROLE);
    await streams.gotoStreamsLayoutTab('sources');
    await streams.streamsSourcesTable.getByTestId('streamsSourceNameLink').click();

    const sourceFlyout = page.testSubj.locator('streamsSourceDetailsFlyout');
    await expect(sourceFlyout.getByTestId('streamsSourceDeleteButton')).toBeVisible();
    await expect(sourceFlyout.getByTestId('streamsSourceGenerateApiKeyButton')).toBeDisabled();
    await expect(sourceFlyout.getByTestId('streamsSourceApiKeyPrivilegeHint')).toContainText(
      'manage_own_api_key'
    );
  });

  test('V2 all without the streams application privilege: key generation is disabled and says why', async ({
    browserAuth,
    page,
    pageObjects: { streams },
  }) => {
    await browserAuth.loginWithCustomRole(V2_ALL_WITH_MANAGE_OWN_API_KEY_ROLE);
    await streams.gotoStreamsLayoutTab('sources');
    await streams.streamsSourcesTable.getByTestId('streamsSourceNameLink').click();

    const sourceFlyout = page.testSubj.locator('streamsSourceDetailsFlyout');
    await expect(sourceFlyout.getByTestId('streamsSourceGenerateApiKeyButton')).toBeDisabled();
    const hint = sourceFlyout.getByTestId('streamsSourceApiKeyPrivilegeHint');
    await expect(hint).toContainText('streams application');
    await expect(hint).toContainText(`source:${SOURCE_ID}`);
  });

  test('V2 manager: the map is editable and key generation shows no privilege hint', async ({
    browserAuth,
    samlAuth,
    page,
    pageObjects: { streams },
  }) => {
    await samlAuth.setCustomRole(V2_MANAGER_ROLE);
    await browserAuth.loginAs(samlAuth.customRoleName);
    await streams.gotoStreamsLayoutTab('map');
    await expect(streams.canvasToolbar).toBeVisible();
    await expect(page.testSubj.locator(READ_ONLY_CALLOUT)).toHaveCount(0);

    await streams.gotoStreamsLayoutTab('sources');
    await streams.streamsSourcesTable.getByTestId('streamsSourceNameLink').click();

    const sourceFlyout = page.testSubj.locator('streamsSourceDetailsFlyout');
    // Keys and privileges load together, so the empty key list means the privilege result is in.
    await expect(sourceFlyout.getByTestId('streamsSourceNoApiKeys')).toBeVisible();
    await expect(sourceFlyout.getByTestId('streamsSourceGenerateApiKeyButton')).toBeVisible();
    await expect(sourceFlyout.getByTestId('streamsSourceApiKeyPrivilegeHint')).toHaveCount(0);
  });
});
