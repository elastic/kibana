/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, type CustomContentTestFixtures } from '../fixtures';

/**
 * Provides dashboards + data views so the analytics no-data page is skipped.
 */
const DASHBOARD_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

// An index of its own with no time field: the dashboard's time range then does not filter the
// panel, and the rows do not depend on when the test runs.
const HOSTS_INDEX = 'custom-content-interactions-scout';
const HOSTS = ['web-1', 'web-2', 'web-3'];

const HOSTS_QUERY = `FROM ${HOSTS_INDEX} | STATS requests = COUNT(*) BY host | SORT host`;

const dashboardRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        dashboard_v2: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

const HOST_TEMPLATE = `
{% for row in rows %}
  <div>
    <button data-cc-action="filter" data-cc-field="host" data-cc-value="{{ row.host.value }}">
      {{ row.host.value }}
    </button>
    <button
      aria-label="Exclude {{ row.host.value }}"
      data-cc-action="filter" data-cc-op="is_not" data-cc-field="host" data-cc-value="{{ row.host.value }}"
    >-</button>
  </div>
{% endfor %}`;

// One button asks for a column the query does not return, the other for a real one.
const MIXED_TEMPLATE = `
{% for row in rows %}
  <div>
    <button data-cc-action="filter" data-cc-field="not_a_column" data-cc-value="{{ row.host.value }}">
      Unknown {{ row.host.value }}
    </button>
    <button data-cc-action="filter" data-cc-field="host" data-cc-value="{{ row.host.value }}">
      Known {{ row.host.value }}
    </button>
  </div>
{% endfor %}`;

spaceTest.describe(
  'Custom content panel click to filter',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, esClient }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DASHBOARD_ARCHIVE);
      await esClient.indices.delete({ index: HOSTS_INDEX, ignore_unavailable: true });
      await esClient.indices.create({
        index: HOSTS_INDEX,
        mappings: { properties: { host: { type: 'keyword' } } },
      });
      await esClient.bulk({
        refresh: true,
        operations: HOSTS.flatMap((host) => [{ index: { _index: HOSTS_INDEX } }, { host }]),
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(dashboardRole);
      await pageObjects.dashboard.openNewDashboard();
    });

    spaceTest.afterAll(async ({ scoutSpace, esClient }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await esClient.indices.delete({ index: HOSTS_INDEX, ignore_unavailable: true });
    });

    const addHostsPanel = async (
      {
        dashboard,
        customContentPanel,
      }: Pick<CustomContentTestFixtures['pageObjects'], 'dashboard' | 'customContentPanel'>,
      template: string
    ) => {
      await dashboard.openAddPanelFlyout();
      await customContentPanel.openFromAddPanelFlyout();
      await customContentPanel.setTemplate(template);
      await customContentPanel.setEsqlQuery(HOSTS_QUERY);
      await customContentPanel.applyAndClose();
    };

    spaceTest(
      'a click adds a filter to the dashboard, and the next click on it flips the same filter',
      async ({ pageObjects }) => {
        const { customContentPanel, filterBar } = pageObjects;
        await addHostsPanel(pageObjects, HOST_TEMPLATE);

        const iframe = customContentPanel.getPanelIframe();
        await expect(iframe.getByRole('button', { name: 'web-1', exact: true })).toBeVisible();
        await expect(iframe.getByRole('button', { name: 'web-3', exact: true })).toBeVisible();

        await spaceTest.step('clicking a host filters the dashboard by it', async () => {
          await customContentPanel.clickPanelButton('web-1');

          await expect
            .poll(() => filterBar.hasFilter({ field: 'host', value: 'web-1', negated: false }))
            .toBe(true);
          // The panel runs its own query with the dashboard's filters, so it narrows too.
          await expect(iframe.getByRole('button', { name: 'web-3', exact: true })).toBeHidden();
          expect(await filterBar.getFilterCount()).toBe(1);
        });

        await spaceTest.step(
          'excluding that host flips the filter instead of adding one',
          async () => {
            await customContentPanel.clickPanelButton('Exclude web-1');

            await expect
              .poll(() => filterBar.hasFilter({ field: 'host', value: 'web-1', negated: true }))
              .toBe(true);
            await expect(iframe.getByRole('button', { name: 'web-3', exact: true })).toBeVisible();
            await expect(iframe.getByRole('button', { name: 'web-1', exact: true })).toBeHidden();
            expect(await filterBar.getFilterCount()).toBe(1);
          }
        );
      }
    );

    spaceTest(
      'a click on a field the query did not return adds nothing',
      async ({ pageObjects }) => {
        const { customContentPanel, filterBar } = pageObjects;
        await addHostsPanel(pageObjects, MIXED_TEMPLATE);

        const iframe = customContentPanel.getPanelIframe();
        await expect(
          iframe.getByRole('button', { name: 'Known web-1', exact: true })
        ).toBeVisible();

        // Nothing happens to wait on when a click is refused, so a real click follows it: once its
        // filter is there, the refused one would be too, since clicks are handled in order.
        await customContentPanel.clickPanelButton('Unknown web-1');
        await customContentPanel.clickPanelButton('Known web-2');

        await expect
          .poll(() => filterBar.hasFilter({ field: 'host', value: 'web-2', negated: false }))
          .toBe(true);
        expect(await filterBar.getFilterCount()).toBe(1);
      }
    );
  }
);
