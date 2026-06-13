/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, MAINTENANCE_WINDOWS_APP_PATH } from '../fixtures';

const TABLE_LOADED_CSS =
  '.euiBasicTable[data-test-subj="maintenance-windows-table"]:not(.euiBasicTable-loading)';
const PAGE_READY_SELECTOR = `${TABLE_LOADED_CSS}, [data-test-subj="mw-empty-prompt"]`;
const TABLE_LOAD_TIMEOUT = 30_000;
const TOAST_TITLE = 'euiToastHeader__title';

// ── API helpers ──────────────────────────────────────────────────────────────

interface MwResponse {
  id: string;
}

const createMw = async (
  kbnClient: KbnClient,
  opts: {
    title: string;
    startDate?: Date;
    notRecurring?: boolean;
    overwrite?: Record<string, unknown>;
  }
): Promise<MwResponse> => {
  const dtstart = (opts.startDate ?? new Date()).toISOString();
  const res = await kbnClient.request<MwResponse>({
    method: 'POST',
    path: '/internal/alerting/rules/maintenance_window',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      title: opts.title,
      duration: 60 * 60 * 1000,
      r_rule: {
        dtstart,
        tzid: 'UTC',
        ...(opts.notRecurring ? { freq: 1, count: 1 } : { freq: 2 }),
      },
      ...opts.overwrite,
    },
  });
  return res.data;
};

const deleteMw = async (kbnClient: KbnClient, id: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/internal/alerting/rules/maintenance_window/${id}`,
    headers: { 'kbn-xsrf': 'scout' },
    ignoreErrors: [404],
  });
};

// ── Page helpers ─────────────────────────────────────────────────────────────

const searchMws = async (page: ScoutPage, text: string) => {
  const searchBox = page.testSubj.locator('maintenance-window-search');
  await searchBox.fill(text);
  await searchBox.press('Enter');
  await page.locator(PAGE_READY_SELECTOR).waitFor({ timeout: TABLE_LOAD_TIMEOUT });
};

// Read status text from the <td data-test-subj="maintenance-windows-column-status"> cell
// directly — no EUI internal CSS classes needed.
const getMwRowStatuses = async (page: ScoutPage): Promise<string[]> => {
  const rows = await page.testSubj.locator('list-item').all();
  const statuses: string[] = [];
  for (const row of rows) {
    const cell = row.locator('[data-test-subj="maintenance-windows-column-status"]');
    statuses.push(
      ((await cell.innerText()) ?? '')
        .trim()
        .replace(/[^a-zA-Z\s]+$/, '')
        .trim()
    );
  }
  return statuses;
};

// Dismiss all visible toasts to prevent accumulation across actions in a single test.
const dismissToasts = async (page: ScoutPage) => {
  for (const btn of await page.testSubj.locator('toastCloseButton').all()) {
    if (await btn.isVisible()) await btn.click();
  }
};

// Opens the actions popover for the first visible row if the action button is
// not already visible.
const clickTableAction = async (page: ScoutPage, action: string) => {
  const actionLocator = page.testSubj.locator(action);
  const directlyVisible = await actionLocator
    .waitFor({ state: 'visible', timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (!directlyVisible) {
    await page.testSubj.click('table-actions-popover');
  }
  await actionLocator.click();
};

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Maintenance windows table', { tag: tags.stateful.classic }, () => {
  const createdIds: string[] = [];

  const uniqueTitle = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await page.locator(PAGE_READY_SELECTOR).waitFor({ timeout: TABLE_LOAD_TIMEOUT });
  });

  test.afterEach(async ({ kbnClient }) => {
    const ids = [...createdIds];
    createdIds.length = 0;
    await Promise.allSettled(ids.map((id) => deleteMw(kbnClient, id)));
  });

  test('should cancel a running maintenance window', async ({ page, kbnClient, kbnUrl }) => {
    const title = uniqueTitle('cancel-running');
    const { id } = await createMw(kbnClient, { title });
    createdIds.push(id);

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, title);

    let statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Running']);

    await clickTableAction(page, 'table-actions-cancel');
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Cancelled running maintenance window '${title}'`
    );
    await dismissToasts(page);

    await searchMws(page, title);
    statuses = await getMwRowStatuses(page);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).not.toBe('Running');
  });

  test('should archive a finished maintenance window', async ({ page, kbnClient, kbnUrl }) => {
    const title = uniqueTitle('archive-finished');
    const { id } = await createMw(kbnClient, {
      title,
      startDate: new Date('2023-05-01'),
      notRecurring: true,
    });
    createdIds.push(id);

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, title);

    let statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Finished']);

    await clickTableAction(page, 'table-actions-archive');
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Archived maintenance window '${title}'`
    );
    await dismissToasts(page);

    await searchMws(page, title);
    statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Archived']);
  });

  test('should cancel and archive a running maintenance window', async ({
    page,
    kbnClient,
    kbnUrl,
  }) => {
    const title = uniqueTitle('cancel-and-archive');
    const { id } = await createMw(kbnClient, { title });
    createdIds.push(id);

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, title);

    let statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Running']);

    await clickTableAction(page, 'table-actions-cancel-and-archive');
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Cancelled and archived running maintenance window '${title}'`
    );
    await dismissToasts(page);

    await searchMws(page, title);
    statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Archived']);
  });

  test('should unarchive a maintenance window', async ({ page, kbnClient, kbnUrl }) => {
    const title = uniqueTitle('unarchive');
    const { id } = await createMw(kbnClient, {
      title,
      startDate: new Date('2023-05-01'),
      notRecurring: true,
    });
    createdIds.push(id);

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, title);

    // Archive first
    await clickTableAction(page, 'table-actions-archive');
    await page.testSubj.click('confirmModalConfirmButton');
    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Archived maintenance window '${title}'`
    );
    await dismissToasts(page);

    await searchMws(page, title);
    let statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Archived']);

    // Then unarchive
    await clickTableAction(page, 'table-actions-unarchive');
    await page.testSubj.click('confirmModalConfirmButton');
    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Unarchived maintenance window '${title}'`
    );
    await dismissToasts(page);

    await searchMws(page, title);
    statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Finished']);
  });

  test('should filter maintenance windows by status', async ({ page, kbnClient, kbnUrl }) => {
    const runningTitle = uniqueTitle('filter-running');
    const finishedTitle = uniqueTitle('filter-finished');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const upcomingTitle = uniqueTitle('filter-upcoming');

    const [r1, r2, r3] = await Promise.all([
      createMw(kbnClient, {
        title: runningTitle,
        startDate: new Date(Date.now() - 5 * 60 * 1000),
      }),
      createMw(kbnClient, {
        title: finishedTitle,
        startDate: new Date('2023-05-01'),
        notRecurring: true,
      }),
      createMw(kbnClient, { title: upcomingTitle, startDate: tomorrow }),
    ]);
    createdIds.push(r1.id, r2.id, r3.id);

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    // Search for a common suffix shared by all three titles using 'filter-'
    await searchMws(page, 'filter-');

    const statuses = await getMwRowStatuses(page);
    expect(statuses).toHaveLength(3);

    await page.testSubj.click('status-filter-button');
    await page.testSubj.click('status-filter-upcoming');

    await page.locator(PAGE_READY_SELECTOR).waitFor({ timeout: TABLE_LOAD_TIMEOUT });
    const filteredStatuses = await getMwRowStatuses(page);
    expect(filteredStatuses).toStrictEqual(['Upcoming']);
  });

  test('should filter maintenance windows by archived status', async ({
    page,
    kbnClient,
    kbnUrl,
  }) => {
    const finishedTitle = uniqueTitle('archived-finished');
    const upcomingTitle = uniqueTitle('archived-upcoming');
    const runningTitle = uniqueTitle('archived-running');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [r1, r2, r3] = await Promise.all([
      createMw(kbnClient, {
        title: finishedTitle,
        startDate: new Date('2023-05-01'),
        notRecurring: true,
      }),
      createMw(kbnClient, { title: upcomingTitle, startDate: tomorrow }),
      createMw(kbnClient, {
        title: runningTitle,
        startDate: new Date(Date.now() - 5 * 60 * 1000),
      }),
    ]);
    createdIds.push(r1.id, r2.id, r3.id);

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, 'archived-');

    let statuses = await getMwRowStatuses(page);
    expect(statuses).toHaveLength(3);
    // The running MW should be first in the list
    expect(statuses[0]).toBe('Running');

    // Cancel-and-archive the running one
    await clickTableAction(page, 'table-actions-cancel-and-archive');
    await page.testSubj.click('confirmModalConfirmButton');
    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText(
      `Cancelled and archived running maintenance window '${runningTitle}'`
    );
    await dismissToasts(page);

    // Filter to show only archived
    await page.testSubj.click('status-filter-button');
    await page.testSubj.click('status-filter-archived');
    await page.locator(PAGE_READY_SELECTOR).waitFor({ timeout: TABLE_LOAD_TIMEOUT });

    statuses = await getMwRowStatuses(page);
    expect(statuses).toStrictEqual(['Archived']);
  });

  test('paginates maintenance windows correctly', async ({ page, kbnClient, kbnUrl }) => {
    // Create 12 MWs so we can paginate to a second page
    const created = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        createMw(kbnClient, { title: `pagination-${i}-${Date.now()}` })
      )
    );
    created.forEach(({ id }) => createdIds.push(id));

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, 'pagination-');

    // Switch to 10-rows-per-page
    await page.testSubj.click('tablePaginationPopoverButton');
    await page.testSubj.click('tablePagination-10-rows');

    await expect(page.testSubj.locator('list-item')).toHaveCount(10);

    // Navigate to page 2
    await page.testSubj.click('pagination-button-1');

    // Second page should have the remaining 2 rows
    await expect(page.testSubj.locator('list-item')).toHaveCount(2);
  });

  test('should delete a maintenance window', async ({ page, kbnClient, kbnUrl }) => {
    const title = uniqueTitle('delete-mw');

    await createMw(kbnClient, { title });

    await page.goto(kbnUrl.get(MAINTENANCE_WINDOWS_APP_PATH));
    await searchMws(page, title);
    await expect(page.testSubj.locator('list-item')).toHaveCount(1);

    await clickTableAction(page, 'table-actions-delete');
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator(TOAST_TITLE)).toContainText('Deleted maintenance window');
    await dismissToasts(page);

    await searchMws(page, title);
    await expect(page.testSubj.locator('list-item')).toHaveCount(0);
  });
});
