/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/ui';

import { ES_SERVICE_ACCOUNT_NAMESPACE } from '../../../../common/service_accounts';
import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../../api/fixtures/service_account_cleanup';
import {
  bindWorkload,
  type TestWorkload,
  unbindWorkloads,
} from '../../api/fixtures/service_account_workloads';
import { test } from '../fixtures';

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';
/** How long the role page may take to render, which is long on a cold local stack. */
const PAGE_LOAD_TIMEOUT_MS = 30_000;

const uniqueName = (prefix: string) => `${prefix}-${randomUUID()}`;

test.describe(
  'Warn about service accounts when changing a role',
  { tag: ['@local-stateful-classic'] },
  () => {
    const created: ServiceAccountPrincipal[] = [];
    const boundWorkloads: TestWorkload[] = [];
    const createdRoles: string[] = [];

    let role: string;
    let accountName: string;
    let workloadId: string;

    test.beforeAll(async ({ esClient, kbnClient }) => {
      role = uniqueName('scout-sa-role');
      createdRoles.push(role);
      await esClient.security.putRole({ name: role, cluster: ['monitor'], refresh: 'wait_for' });

      accountName = uniqueName('scout-sa-usage');
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name: accountName });
      await kbnClient.request({
        method: 'POST',
        path: SERVICE_ACCOUNT_ENDPOINT,
        body: { name: accountName, roles: [role] },
        retries: 0,
      });

      workloadId = uniqueName('scout-sa-job');
      boundWorkloads.push({ workloadId });
      await bindWorkload(kbnClient, workloadId, `${ES_SERVICE_ACCOUNT_NAMESPACE}/${accountName}`);
    });

    test.afterAll(async ({ esClient, kbnClient, config }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () => unbindWorkloads(kbnClient, boundWorkloads),
        async () => deleteServiceAccounts(esClient, config, created),
        async () => {
          for (const name of createdRoles) {
            await esClient.security.deleteRole({ name }, { ignore: [404] });
          }
        },
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(error instanceof Error ? error : new Error('Role usage cleanup failed.'));
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'Role service account usage cleanup failed.');
      }
    });

    test('warns on the role page and in both delete confirmations', async ({
      browserAuth,
      page,
    }) => {
      await browserAuth.loginAsAdmin();

      await test.step('the edit page names the account holding the role', async () => {
        await page.gotoApp(`management/security/roles/edit/${encodeURIComponent(role)}`);
        const callout = page.getByTestId('serviceAccountRoleUsageCallout');
        await callout.waitFor({ state: 'visible', timeout: PAGE_LOAD_TIMEOUT_MS });
        await expect(callout).toContainText('1 service account uses this role');
        await expect(callout).toContainText(accountName);
        await expect(callout.getByTestId('serviceAccountRoleUsageWorkloadCount')).toHaveText(
          '1 workload'
        );
      });

      await test.step('expanding the account lists its workloads', async () => {
        await page.getByTestId('serviceAccountRoleUsageCallout').getByText(accountName).click();
        await expect(page.getByTestId('serviceAccountBoundWorkloadsTable')).toContainText(
          `Test job ${workloadId}`
        );
      });

      await test.step('the save hint appears once the role is edited', async () => {
        await expect(page.getByTestId('serviceAccountRoleUsageSaveHint')).toBeHidden();
        await page.getByTestId('roleFormDescriptionInput').fill('Edited by Scout');
        await expect(page.getByTestId('serviceAccountRoleUsageSaveHint')).toHaveText(
          'Saving affects 1 service account'
        );
      });

      await test.step('the edit page delete confirmation warns too', async () => {
        await page.getByRole('button', { name: 'Delete role' }).click();
        const modal = page.getByRole('alertdialog');
        await expect(modal.getByTestId('serviceAccountRoleUsageCallout')).toContainText(
          'Deleting this role immediately removes the privileges it grants'
        );
        await modal.getByRole('button', { name: "No, don't delete" }).click();
        await expect(modal).toBeHidden();
      });

      await test.step('the roles grid delete confirmation warns too', async () => {
        // Leaving with the edit made above would otherwise prompt.
        await page.getByTestId('roleFormCancelButton').click();
        await page.getByTestId('rolesTable').waitFor({ state: 'visible' });
        // The grid searches on Enter, so wait for that query rather than the first page's.
        const searched = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.endsWith('/api/security/role/_query') &&
            response.request().method() === 'POST'
        );
        await page.getByTestId('searchRoles').fill(role);
        await page.getByTestId('searchRoles').press('Enter');
        await searched;
        const row = page.getByTestId('roleRow').filter({ hasText: role });
        await row.getByTestId('euiCollapsedItemActionsButton').click();
        await page.getByTestId(`delete-role-action-${role}`).click();
        await expect(page.getByTestId('serviceAccountRoleUsageCallout')).toContainText(accountName);
        await page.getByTestId('confirmModalCancelButton').click();
      });
    });
  }
);
