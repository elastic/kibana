/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import {
  loadSavedQuery,
  cleanupSavedQuery,
  loadPack,
  cleanupPack,
  getPack,
  getFirstPackagePolicyIds,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'Packs - Create and Edit',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let savedQueryId: string;
    let savedQueryName: string;
    let nomappingSavedQueryId: string;
    let nomappingSavedQueryName: string;
    let oneMappingSavedQueryId: string;
    let oneMappingSavedQueryName: string;
    let multipleMappingsSavedQueryId: string;
    let multipleMappingsSavedQueryName: string;

    test.beforeAll(async ({ kbnClient }) => {
      // Load 4 saved queries with different ECS mappings
      const sq1 = await loadSavedQuery(kbnClient);
      savedQueryId = sq1.saved_object_id;
      savedQueryName = sq1.id;

      const sq2 = await loadSavedQuery(kbnClient, {
        ecs_mapping: {},
        interval: '3600',
        query: 'select * from uptime;',
      });
      nomappingSavedQueryId = sq2.saved_object_id;
      nomappingSavedQueryName = sq2.id;

      const sq3 = await loadSavedQuery(kbnClient, {
        ecs_mapping: {
          'client.geo.continent_name': {
            field: 'seconds',
          },
        },
        interval: '3600',
        query: 'select * from uptime;',
        timeout: 607,
      });
      oneMappingSavedQueryId = sq3.saved_object_id;
      oneMappingSavedQueryName = sq3.id;

      const sq4 = await loadSavedQuery(kbnClient, {
        ecs_mapping: {
          labels: {
            field: 'days',
          },
          tags: {
            field: 'seconds',
          },
          'client.address': {
            field: 'total_seconds',
          },
        },
        interval: '3600',
        query: 'select * from uptime;',
      });
      multipleMappingsSavedQueryId = sq4.saved_object_id;
      multipleMappingsSavedQueryName = sq4.id;
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
      await pageObjects.packs.navigate();
    });

    test.afterAll(async ({ kbnClient }) => {
      await cleanupSavedQuery(kbnClient, savedQueryId);
      await cleanupSavedQuery(kbnClient, nomappingSavedQueryId);
      await cleanupSavedQuery(kbnClient, oneMappingSavedQueryId);
      await cleanupSavedQuery(kbnClient, multipleMappingsSavedQueryId);
    });

    test('Check if result type is correct', async ({ page, pageObjects, kbnClient }) => {
      let resultTypePackId: string | undefined;
      try {
        const packs = pageObjects.packs;

        await test.step('Create pack with queries via API (Query1 Snapshot, Query2 Differential, Query3 Differential Ignore removals)', async () => {
          const pack = await loadPack(kbnClient, {
            queries: {
              Query1: {
                ecs_mapping: {},
                interval: 3600,
                query: 'select * from uptime;',
                snapshot: true,
              },
              Query2: {
                ecs_mapping: {},
                interval: 3600,
                query: 'select * from uptime;',
                snapshot: false,
                removed: true,
              },
              Query3: {
                ecs_mapping: {},
                interval: 3600,
                query: 'select * from uptime;',
                snapshot: false,
                removed: false,
              },
            },
          });
          resultTypePackId = pack.saved_object_id;
        });

        await test.step('Navigate to pack details, edit result types and update', async () => {
          if (!resultTypePackId) {
            throw new Error('Expected resultTypePackId to be defined after pack creation');
          }

          await packs.navigateToPackDetail(resultTypePackId);
          await packs.clickEditPack();

          await expect(page.getByText('Query1')).toBeVisible();
          await expect(page.getByText('Query2')).toBeVisible();
          await expect(page.getByText('Query3')).toBeVisible();

          await page.locator(`[aria-label="Edit Query1"]`).click();
          await page.testSubj.locator('resultsTypeField').click();
          await page.getByRole('option', { name: 'Differential', exact: true }).click();
          await packs.clickSaveQueryInFlyout();

          await page.locator(`[aria-label="Edit Query2"]`).click();
          await page.testSubj.locator('resultsTypeField').click();
          await page.getByRole('option', { name: 'Differential (Ignore removals)' }).click();
          await packs.clickSaveQueryInFlyout();

          await page.locator(`[aria-label="Edit Query3"]`).click();
          await page.testSubj.locator('resultsTypeField').click();
          await page.getByRole('option', { name: 'Snapshot' }).click();
          await packs.clickSaveQueryInFlyout();

          await packs.clickUpdatePack();
        });
      } finally {
        if (resultTypePackId) {
          await cleanupPack(kbnClient, resultTypePackId);
        }
      }
    });

    test('Check if pack is created: should add a pack from a saved query', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      let packId: string | undefined;
      const packName = `Pack-name${Date.now()}`;
      try {
        const packs = pageObjects.packs;

        await test.step('Create pack with saved query', async () => {
          await packs.clickAddPack();
          await packs.fillPackName(packName);
          await packs.fillPackDescription('Pack description');

          await packs.clickAddQuery();
          await expect(page.getByText('Attach next query')).toBeVisible();
          await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
          await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();
          await packs.selectSavedQuery(savedQueryName);
          await page.testSubj.locator('osquery-interval-field').fill('5');
          await packs.clickSaveQueryInFlyout();

          await expect(
            page.locator('tbody > tr').filter({ hasText: savedQueryName })
          ).toBeVisible();
          await packs.clickSavePack();

          await waitForPageReady(page);
          const packUrl = page.url();
          const packIdMatch = packUrl.match(/\/packs\/([^/]+)/);
          if (packIdMatch) {
            packId = packIdMatch[1];
          }
        });

        await test.step('Verify pack appears in list', async () => {
          await expect(page.getByText(`Successfully created "${packName}" pack`)).toBeVisible({
            timeout: 30_000,
          });

          await pageObjects.packs.ensureAllPacksVisible();

          await expect(page.getByRole('link', { name: packName })).toBeVisible();
        });
      } finally {
        if (packId) {
          await cleanupPack(kbnClient, packId);
        }
      }
    });

    test('to click the edit button and edit pack: should edit pack and add new query', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      const packName = pack.name;
      const newQueryName = `new-query-name${Date.now()}`;
      try {
        const packs = pageObjects.packs;

        await test.step('Open pack and add new query', async () => {
          await packs.navigateToPackDetail(packId);
          await packs.clickEditPack();

          await expect(page.getByText(`Edit ${packName}`)).toBeVisible();
          await packs.clickAddQuery();

          await expect(page.getByText('Attach next query')).toBeVisible();
          await page.testSubj.locator('kibanaCodeEditor').click();
          await page.testSubj.locator('kibanaCodeEditor').pressSequentially('select * from uptime');
          await page.locator('input[name="id"]').fill(`${savedQueryName}`);

          await packs.clickSaveQueryInFlyout();
          await expect(page.getByText('ID must be unique')).toBeVisible();

          await page.locator('input[name="id"]').fill(newQueryName);
          await expect(page.getByText('ID must be unique')).not.toBeVisible();
          await expect(page.locator('input[name="id"]')).toHaveValue(newQueryName);
          await packs.clickSaveQueryInFlyout();
        });

        await test.step('Verify new query and update pack', async () => {
          await expect(page.locator('tbody > tr').filter({ hasText: newQueryName })).toBeVisible({
            timeout: 15_000,
          });
          await packs.clickUpdatePack();
          await expect(page.getByText(`Successfully updated "${packName}" pack`)).toBeVisible({
            timeout: 30_000,
          });
        });
      } finally {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should trigger validation when saved query is being chosen', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      try {
        const packs = pageObjects.packs;

        await test.step('Open pack and add query', async () => {
          await packs.navigateToPackDetail(packId);
          await packs.clickEditPack();

          await packs.clickAddQuery();
          await expect(page.getByText('Attach next query')).toBeVisible();
          await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
          await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();
          await expect(page.getByText('ID must be unique')).not.toBeVisible();
        });

        await test.step('Select saved query and verify ID must be unique validation', async () => {
          await packs.selectSavedQuery(savedQueryName);
          await packs.clickSaveQueryInFlyout();
          await expect(page.getByText('ID must be unique')).toBeVisible();
          await packs.clickCancelQueryInFlyout();
        });
      } finally {
        await cleanupPack(kbnClient, packId);
      }
    });

    test(
      'should open lens in new tab',
      { tag: [...tags.stateful.classic] },
      async ({ page, pageObjects, kbnClient }) => {
        test.skip();
        test.setTimeout(300_000);
        const policyIds = await getFirstPackagePolicyIds(kbnClient);
        const pack = await loadPack(kbnClient, {
          policy_ids: policyIds,
          queries: {
            [savedQueryName]: {
              ecs_mapping: {},
              interval: 3600,
              query: 'select * from uptime;',
            },
          },
        });
        const packId = pack.saved_object_id;
        const packName = pack.name;
        try {
          let lensUrl = '';

          await test.step('Set up window.open stub, navigate to pack details and click View in Lens', async () => {
            await page.exposeFunction('__capturedWindowOpen', (url: string) => {
              lensUrl = url;
            });
            await page.evaluate(() => {
              window.open = ((url: string) => {
                // @ts-expect-error exposed function
                window.__capturedWindowOpen(url);

                return null;
              }) as typeof window.open;
            });

            await pageObjects.packs.navigateToPackDetail(packId);
            await page.testSubj
              .locator('docsLoading')
              .waitFor({ state: 'visible' })
              .catch(() => {});
            await page.testSubj
              .locator('docsLoading')
              .waitFor({ state: 'hidden', timeout: 60_000 })
              .catch(() => {});

            // eslint-disable-next-line playwright/no-nth-methods -- first visible result in pack queries table
            const viewInLensButton = page.locator('[aria-label="View in Lens"]').first();
            await viewInLensButton.waitFor({ state: 'visible', timeout: 30_000 });
            await viewInLensButton.click();
          });

          await test.step('Navigate to captured Lens URL and verify', async () => {
            expect(lensUrl).toBeTruthy();
            const absoluteLensUrl = lensUrl.startsWith('http')
              ? lensUrl
              : new URL(lensUrl, page.url()).href;
            await page.goto(absoluteLensUrl);
            await expect(page.testSubj.locator('lnsWorkspace')).toBeVisible({ timeout: 60_000 });
            await expect(page.testSubj.locator('breadcrumbs')).toContainText(
              `Action pack_${packName}_${savedQueryName}`
            );
          });
        } finally {
          await cleanupPack(kbnClient, packId);
        }
      }
    );

    test(
      'should open discover in new tab',
      { tag: [...tags.stateful.classic] },
      async ({ page, pageObjects, kbnClient }) => {
        test.skip();
        test.setTimeout(240_000);
        const policyIds = await getFirstPackagePolicyIds(kbnClient);
        const pack = await loadPack(kbnClient, {
          policy_ids: policyIds,
          queries: {
            [savedQueryName]: {
              ecs_mapping: {},
              interval: 3600,
              query: 'select * from uptime;',
            },
          },
        });
        const packId = pack.saved_object_id;
        const packName = pack.name;
        try {
          let discoverHref: string | null = null;

          await test.step('Navigate to pack details and get Discover link', async () => {
            await pageObjects.packs.navigateToPackDetail(packId);

            // eslint-disable-next-line playwright/no-nth-methods -- first visible result in pack queries table
            const discoverLink = page.locator('[aria-label="View in Discover"]').first();
            await discoverLink.waitFor({ state: 'visible', timeout: 30_000 });

            // Verify the href contains the pack action_id filter
            await expect(discoverLink).toHaveAttribute(
              'href',
              expect.stringContaining(`pack_${packName}_${savedQueryName}`)
            );

            discoverHref = await discoverLink.evaluate((el) => el.getAttribute('href'));
          });

          await test.step('Navigate to Discover and verify filter is applied', async () => {
            expect(discoverHref).toBeTruthy();
            const baseUrl = new URL(page.url()).origin;
            await page.goto(`${baseUrl}${discoverHref}`);

            await expect(page.testSubj.locator('breadcrumbs')).toContainText('Discover', {
              timeout: 30_000,
            });

            const docTable = page.testSubj.locator('discoverDocTable');
            const start = Date.now();
            while (Date.now() - start < 180_000) {
              if (await docTable.isVisible({ timeout: 10_000 }).catch(() => false)) break;
              await page.reload();
            }

            await expect(docTable).toBeVisible({ timeout: 30_000 });

            await expect(
              page.getByText(`action_id: pack_${packName}_${savedQueryName}`)
            ).toBeVisible({ timeout: 30_000 });

            await expect(page.getByText('logs-osquery_manager.result')).toBeVisible({
              timeout: 10_000,
            });
          });
        } finally {
          await cleanupPack(kbnClient, packId);
        }
      }
    );

    test('deactivate and activate pack', async ({ kbnClient, pageObjects }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      try {
        await test.step('Deactivate pack via API', async () => {
          await kbnClient.request({
            method: 'PUT',
            path: `/api/osquery/packs/${packId}`,
            body: { enabled: false },
          });
          const packData = await getPack(kbnClient, packId);
          expect(packData.enabled).toBe(false);
        });

        await test.step('Activate pack via API', async () => {
          await kbnClient.request({
            method: 'PUT',
            path: `/api/osquery/packs/${packId}`,
            body: { enabled: true },
          });
          const packData = await getPack(kbnClient, packId);
          expect(packData.enabled).toBe(true);
        });
      } finally {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should verify that packs are triggered', async ({ page, pageObjects, kbnClient }) => {
      test.skip();
      test.setTimeout(360_000); // Pack execution + 5-min result polling
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 60,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      const packName = pack.name;
      try {
        const packs = pageObjects.packs;

        await test.step('Navigate to pack details and wait for results', async () => {
          await packs.navigateToPackDetail(packId);
          await expect(page.getByText(`${packName} details`)).toBeVisible();

          let lastResultsDate = '-';
          const maxWait = Date.now() + 300_000;

          while (lastResultsDate === '-' && Date.now() < maxWait) {
            await page.testSubj
              .locator('docsLoading')
              .waitFor({ state: 'hidden', timeout: 30_000 })
              .catch(() => {});
            const packQueryResultsDateCells = page.locator(
              'tbody .euiTableRow > td:nth-child(5) > .euiTableCellContent'
            );
            if ((await packQueryResultsDateCells.count()) > 0) {
              // eslint-disable-next-line playwright/no-nth-methods -- first row's result cell in table
              lastResultsDate = (await packQueryResultsDateCells.first().textContent()) || '-';
            }

            if (lastResultsDate === '-') {
              await page.reload();
              await page.testSubj
                .locator('docsLoading')
                .waitFor({ state: 'hidden', timeout: 30_000 })
                .catch(() => {});
            }
          }
        });

        await test.step('Verify pack results badges', async () => {
          // Ensure loading spinners are gone before asserting badges
          await page.testSubj.locator('docsLoading').waitFor({ state: 'hidden', timeout: 30_000 });

          await expect(page.testSubj.locator('last-results-date')).toBeVisible({
            timeout: 30_000,
          });
          await expect(page.testSubj.locator('docs-count-badge')).toContainText('1', {
            timeout: 30_000,
          });
          await expect(page.testSubj.locator('agent-count-badge')).toContainText('1', {
            timeout: 30_000,
          });
          // Wait for errors column to finish loading before asserting (spinner -> packResultsErrorsEmpty)
          await expect(page.testSubj.locator('packResultsErrorsEmpty')).toBeVisible({
            timeout: 30_000,
          });
          await expect(page.testSubj.locator('packResultsErrorsEmpty')).toHaveCount(1);
        });
      } finally {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('delete all queries in pack', async ({ page, pageObjects, kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      const packName = pack.name;
      try {
        const packs = pageObjects.packs;

        await test.step('Open pack, select all queries and delete', async () => {
          await packs.navigateToPackDetail(packId);
          await packs.clickEditPack();

          await expect(page.getByText(`Edit ${packName}`)).toBeVisible({ timeout: 15_000 });
          await page.testSubj.locator('checkboxSelectAll').click();
          await page.getByRole('button', { name: /^Delete \d+ quer(y|ies)/ }).click();

          await packs.clickUpdatePack();
          await expect(page.getByText(`Successfully updated "${packName}" pack`)).toBeVisible({
            timeout: 30_000,
          });
        });

        await test.step('Verify pack has no queries', async () => {
          await packs.navigateToPackDetail(packId);
          await expect(page.getByText(`${packName} details`)).toBeVisible({
            timeout: 15_000,
          });
          await expect(page.getByText(/^No items found/)).toBeVisible({ timeout: 15_000 });
        });
      } finally {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('enable changing saved queries and ecs_mappings', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      try {
        const packs = pageObjects.packs;

        await test.step('Open pack and add query', async () => {
          await packs.navigateToPackDetail(packId);
          await packs.clickEditPack();

          await packs.clickAddQuery();
          await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
          await expect(page.testSubj.locator('kibanaCodeEditor')).toBeVisible();
        });

        await test.step('Switch between saved queries and verify ECS mapping changes', async () => {
          await packs.selectSavedQuery(multipleMappingsSavedQueryName);
          await expect(page.getByText('Custom key/value pairs')).toBeVisible();
          await expect(page.getByText('Days of uptime')).toBeVisible();
          await expect(page.getByText('List of keywords used to tag each')).toBeVisible();
          await expect(page.getByText('Seconds of uptime')).toBeVisible();
          await expect(page.getByText('Client network address.')).toBeVisible();
          await expect(page.getByText('Total uptime seconds')).toBeVisible();
          await expect(page.testSubj.locator('ECSMappingEditorForm')).toHaveCount(4);

          await packs.selectSavedQuery(nomappingSavedQueryName);
          await expect(page.getByText('Custom key/value pairs')).not.toBeVisible();
          await expect(page.getByText('Days of uptime')).not.toBeVisible();
          await expect(page.getByText('List of keywords used to tag each')).not.toBeVisible();
          await expect(page.getByText('Seconds of uptime')).not.toBeVisible();
          await expect(page.getByText('Client network address.')).not.toBeVisible();
          await expect(page.getByText('Total uptime seconds')).not.toBeVisible();
          await expect(page.testSubj.locator('ECSMappingEditorForm')).toHaveCount(1);

          await packs.selectSavedQuery(oneMappingSavedQueryName);
          await expect(page.getByText('Name of the continent')).toBeVisible();
          await expect(page.getByText('Seconds of uptime')).toBeVisible();
          await expect(page.testSubj.locator('ECSMappingEditorForm')).toHaveCount(2);

          await packs.clickSaveQueryInFlyout();
        });

        await test.step('Re-open query and verify saved ECS mapping and timeout', async () => {
          await page.locator(`[aria-label="Edit ${oneMappingSavedQueryName}"]`).click();

          await expect(page.getByText('Name of the continent')).toBeVisible();
          await expect(page.getByText('Seconds of uptime')).toBeVisible();
          await expect(page.testSubj.locator('timeout-input')).toHaveValue('607');
        });
      } finally {
        await cleanupPack(kbnClient, packId);
      }
    });

    test('should delete pack', async ({ pageObjects, kbnClient }) => {
      const policyIds = await getFirstPackagePolicyIds(kbnClient);
      const pack = await loadPack(kbnClient, {
        policy_ids: policyIds,
        queries: {
          [savedQueryName]: {
            ecs_mapping: {},
            interval: 3600,
            query: 'select * from uptime;',
          },
        },
      });
      const packId = pack.saved_object_id;
      try {
        const packs = pageObjects.packs;

        await test.step('Open pack and navigate to edit', async () => {
          await packs.navigateToPackDetail(packId);
          await packs.clickEditPack();
        });

        await test.step('Delete pack and confirm', async () => {
          await packs.deleteAndConfirm('pack');
        });
      } finally {
        await cleanupPack(kbnClient, packId).catch(() => {});
      }
    });
  }
);
