/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { KbnClient, KibanaRole } from '@kbn/scout';
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
/** Service accounts take `manage_security`. The feature privilege opens Stack Management. */
const SERVICE_ACCOUNT_ADMIN_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_security'] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};

const uniqueName = (prefix: string) => `${prefix}-${randomUUID()}`;

test.describe(
  'View the workloads bound to service accounts',
  { tag: ['@local-stateful-classic'] },
  () => {
    const created: ServiceAccountPrincipal[] = [];
    const boundWorkloads: TestWorkload[] = [];

    const idOf = (name: string) => `${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`;

    const createAccount = async (kbnClient: KbnClient, name: string) => {
      created.push({ namespace: ES_SERVICE_ACCOUNT_NAMESPACE, name });
      await kbnClient.request({
        method: 'POST',
        path: SERVICE_ACCOUNT_ENDPOINT,
        body: { name, roles: ['viewer'] },
        retries: 0,
      });
    };

    test.afterAll(async ({ esClient, kbnClient, config }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () => unbindWorkloads(kbnClient, boundWorkloads),
        async () => deleteServiceAccounts(esClient, config, created),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('View workloads cleanup failed.')
          );
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'Service account view workloads cleanup failed.');
      }
    });

    test('counts the bound workloads and lists them', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      const prefix = uniqueName('scout-sa-view');
      const bound = `${prefix}-bound`;
      const unbound = `${prefix}-unbound`;
      const workloadId = uniqueName('scout-sa-job');
      await createAccount(kbnClient, bound);
      await createAccount(kbnClient, unbound);
      boundWorkloads.push({ workloadId });
      await bindWorkload(kbnClient, workloadId, idOf(bound));

      await browserAuth.loginWithCustomRole(SERVICE_ACCOUNT_ADMIN_ROLE);
      const { serviceAccounts } = pageObjects;
      await serviceAccounts.goto();
      await serviceAccounts.searchFor(prefix);

      await test.step('count the workloads of each account', async () => {
        await expect(serviceAccounts.workloadCount(bound)).toHaveText('1');
        await expect(serviceAccounts.viewWorkloadsLink(bound)).toBeVisible();
        await expect(serviceAccounts.workloadCount(unbound)).toHaveText('0');
        await expect(serviceAccounts.viewWorkloadsLink(unbound)).toBeHidden();
      });

      await test.step('list the bound workload', async () => {
        await serviceAccounts.openWorkloads(bound);
        await expect(serviceAccounts.workloadsModal).toContainText(`Workloads bound to "${bound}"`);
        // `toContainText`, since EUI adds hidden copy markers to each cell's text.
        await expect(await serviceAccounts.boundWorkloadsTable.cells('displayName')).toContainText([
          `Test job ${workloadId}`,
        ]);
        await expect(
          serviceAccounts.workloadsModal.getByTestId('serviceAccountBoundWorkloadLink')
        ).toHaveAttribute('href', `/app/service_accounts_test/jobs/${workloadId}`);
        await expect(serviceAccounts.workloadsModal).not.toContainText('Force delete account');
      });

      await test.step('the list has no accessibility violations', async () => {
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="serviceAccountWorkloadsModal"]'],
        });
        expect(violations).toStrictEqual([]);
      });

      await test.step('close the list', async () => {
        await serviceAccounts.closeWorkloads();
        await expect(serviceAccounts.workloadsModal).toBeHidden();
      });
    });
  }
);
