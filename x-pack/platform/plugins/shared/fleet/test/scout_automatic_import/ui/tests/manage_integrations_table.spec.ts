/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { getManageIntegrationsRole } from '../../../scout/ui/fixtures/services/privileges';

const MOCK_PENDING = {
  integrationId: 'int-pending',
  title: 'Pending Integration',
  totalDataStreamCount: 1,
  successfulDataStreamCount: 0,
  version: '1.0.0',
  createdBy: 'elastic',
  status: 'pending',
};

const MOCK_COMPLETED = {
  integrationId: 'int-completed',
  title: 'Completed Integration',
  totalDataStreamCount: 2,
  successfulDataStreamCount: 2,
  version: '1.0.0',
  createdBy: 'elastic',
  status: 'completed',
};

const MOCK_APPROVED = {
  integrationId: 'int-approved',
  title: 'Approved Integration',
  totalDataStreamCount: 1,
  successfulDataStreamCount: 1,
  version: '1.0.0',
  createdBy: 'elastic',
  status: 'approved',
};

const MOCK_FAILED = {
  integrationId: 'int-failed',
  title: 'Failed Integration',
  totalDataStreamCount: 1,
  successfulDataStreamCount: 0,
  version: '1.0.0',
  createdBy: 'elastic',
  status: 'failed',
};

const MOCK_CANCELLED = {
  integrationId: 'int-cancelled',
  title: 'Cancelled Integration',
  totalDataStreamCount: 1,
  successfulDataStreamCount: 0,
  version: '1.0.0',
  createdBy: 'elastic',
  status: 'cancelled',
};

const ALL_INTEGRATIONS = [MOCK_PENDING, MOCK_COMPLETED, MOCK_APPROVED];

async function mockIntegrationsList(page: ScoutPage, items: unknown[]) {
  await page.route('**/api/automatic_import/integrations', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    })
  );
  await page.route('**/api/fleet/epm/packages**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  );
  await page.route('**/internal/security/user_profile/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
}

async function mockIntegrationDetails(page: ScoutPage, integrationId: string) {
  await page.route(`**/api/automatic_import/integrations/${integrationId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        integrationResponse: {
          title: 'Completed Integration',
          version: '1.0.0',
          dataStreams: [],
        },
      }),
    })
  );
}

test.describe('Manage Integrations Table', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await mockIntegrationsList(page, ALL_INTEGRATIONS);
    await browserAuth.loginWithCustomRole(getManageIntegrationsRole());
    await pageObjects.manageIntegrationsTable.navigateTo();
  });

  test('renders the table with all integration rows', async ({ pageObjects }) => {
    await expect(pageObjects.manageIntegrationsTable.getTable()).toBeVisible();
    await expect(pageObjects.manageIntegrationsTable.getTableRows()).toHaveCount(3);
  });

  test('shows inline Review & Approve button for completed integrations', async ({
    pageObjects,
  }) => {
    await expect(
      pageObjects.manageIntegrationsTable.getReviewApproveInlineBtn('Completed Integration')
    ).toBeVisible();
  });

  test('shows empty state when no integrations exist', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, []);
    await pageObjects.manageIntegrationsTable.navigateToEmpty();
    await expect(pageObjects.manageIntegrationsTable.getTable()).toBeVisible();
    await expect(pageObjects.manageIntegrationsTable.getTable()).toContainText('No items found');
  });

  test('filters rows by search text', async ({ pageObjects }) => {
    await pageObjects.manageIntegrationsTable.searchFor('Completed');
    await expect(pageObjects.manageIntegrationsTable.getTableRows()).toHaveCount(1);
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Completed Integration')
    ).toBeVisible();
  });

  test('all menu items are visible when actions button is clicked', async ({ pageObjects }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveMenuItem()).toBeVisible();
    await expect(pageObjects.manageIntegrationsTable.getInstallMenuItem()).toBeVisible();
    await expect(pageObjects.manageIntegrationsTable.getDownloadZipMenuItem()).toBeVisible();
    await expect(pageObjects.manageIntegrationsTable.getEditMenuItem()).toBeVisible();
    await expect(pageObjects.manageIntegrationsTable.getDeleteMenuItem()).toBeVisible();
  });

  test('Review & Approve is disabled for approved integration', async ({ pageObjects }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Approved Integration');
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveMenuItem()).toBeDisabled();
  });

  test('Install is enabled for approved integration', async ({ pageObjects }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Approved Integration');
    await expect(pageObjects.manageIntegrationsTable.getInstallMenuItem()).toBeEnabled();
  });

  test('Install is disabled for pending integration', async ({ pageObjects }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await expect(pageObjects.manageIntegrationsTable.getInstallMenuItem()).toBeDisabled();
  });

  test('Download .zip is disabled when not all data streams are successful', async ({
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await expect(pageObjects.manageIntegrationsTable.getDownloadZipMenuItem()).toBeDisabled();
  });

  test('Review & Approve and Download .zip are disabled for pending integration', async ({
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveMenuItem()).toBeDisabled();
    await expect(pageObjects.manageIntegrationsTable.getDownloadZipMenuItem()).toBeDisabled();
  });

  test('shows confirm modal when Delete is clicked', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_PENDING]);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await pageObjects.manageIntegrationsTable.getDeleteMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getDeleteConfirmButton()).toBeVisible();
  });

  test('cancel closes the confirm modal and the row stays', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_PENDING]);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await pageObjects.manageIntegrationsTable.getDeleteMenuItem().click();
    await pageObjects.manageIntegrationsTable.getDeleteCancelButton().click();
    await expect(pageObjects.manageIntegrationsTable.getDeleteConfirmButton()).toBeHidden();
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Pending Integration')
    ).toBeVisible();
  });

  test('opens Review & Approve modal from the actions menu', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();
  });

  test('opens Review & Approve modal from the inline button', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable
      .getReviewApproveInlineBtn('Completed Integration')
      .click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();
  });

  test('Approve button is disabled until version and category are filled', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await page.route('**/api/fleet/epm/categories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'security', title: 'Security', count: 1 }] }),
      })
    );
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();

    await expect(
      pageObjects.manageIntegrationsTable.getReviewApproveInstallButton()
    ).toBeDisabled();

    await pageObjects.manageIntegrationsTable.getReviewModalVersionInput().fill('1.0.0');
    await expect(
      pageObjects.manageIntegrationsTable.getReviewApproveInstallButton()
    ).toBeDisabled();

    const categoryInput = pageObjects.manageIntegrationsTable
      .getReviewModalCategoriesComboBox()
      .locator('input');
    await categoryInput.click();
    await categoryInput.press('ArrowDown');
    await categoryInput.press('Enter');
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveInstallButton()).toBeEnabled();
  });

  test('Approve flow calls the approve API and closes the modal', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await page.route('**/api/fleet/epm/categories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'security', title: 'Security', count: 1 }] }),
      })
    );
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}/approve`,
      (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();

    await pageObjects.manageIntegrationsTable.getReviewModalVersionInput().fill('1.0.0');
    const categoryInput = pageObjects.manageIntegrationsTable
      .getReviewModalCategoriesComboBox()
      .locator('input');
    await categoryInput.click();
    await categoryInput.press('ArrowDown');
    await categoryInput.press('Enter');

    await pageObjects.manageIntegrationsTable.getReviewModalAutoInstallCheckbox().uncheck();

    const approveRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_COMPLETED.integrationId}/approve`) &&
        req.method() === 'POST'
    );
    await pageObjects.manageIntegrationsTable.getReviewApproveInstallButton().click();
    await approveRequest;
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeHidden();
  });

  test('Review modal auto-install checkbox: is checked by default', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();
    const checkbox = pageObjects.manageIntegrationsTable.getReviewModalAutoInstallCheckbox();
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test('Review modal auto-install checkbox: approve with it on calls approve, download, and EPM install then closes', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await page.route('**/api/fleet/epm/categories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'security', title: 'Security', count: 1 }] }),
      })
    );
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}/approve`,
      (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}/download*`,
      (route) =>
        route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/zip' },
          body: Buffer.from('PK'),
        })
    );
    await page.route('**/api/fleet/epm/packages', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
      return route.continue();
    });

    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();
    await expect(
      pageObjects.manageIntegrationsTable.getReviewModalAutoInstallCheckbox()
    ).toBeChecked();

    await pageObjects.manageIntegrationsTable.getReviewModalVersionInput().fill('1.0.0');
    const categoryInput = pageObjects.manageIntegrationsTable
      .getReviewModalCategoriesComboBox()
      .locator('input');
    await categoryInput.click();
    await categoryInput.press('ArrowDown');
    await categoryInput.press('Enter');

    const approveRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_COMPLETED.integrationId}/approve`) &&
        req.method() === 'POST'
    );
    const downloadRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_COMPLETED.integrationId}/download`) &&
        req.url().includes('intent=install') &&
        req.method() === 'GET'
    );
    const installRequest = page.waitForRequest(
      (req) => req.url().includes('/api/fleet/epm/packages') && req.method() === 'POST'
    );
    await pageObjects.manageIntegrationsTable.getReviewApproveInstallButton().click();
    await Promise.all([approveRequest, downloadRequest, installRequest]);
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeHidden();
  });

  test('Review modal auto-install checkbox: when off, only the approve API runs (no install download)', async ({
    page,
    pageObjects,
  }) => {
    let installIntentDownloadCount = 0;
    await page.route('**/api/automatic_import/integrations/**/download**', (route) => {
      if (new URL(route.request().url()).searchParams.get('intent') === 'install') {
        installIntentDownloadCount += 1;
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/zip',
        body: Buffer.from('PK'),
      });
    });

    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await page.route('**/api/fleet/epm/categories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'security', title: 'Security', count: 1 }] }),
      })
    );
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}/approve`,
      (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();
    await pageObjects.manageIntegrationsTable.getReviewModalVersionInput().fill('1.0.0');
    const categoryInput = pageObjects.manageIntegrationsTable
      .getReviewModalCategoriesComboBox()
      .locator('input');
    await categoryInput.click();
    await categoryInput.press('ArrowDown');
    await categoryInput.press('Enter');
    await pageObjects.manageIntegrationsTable.getReviewModalAutoInstallCheckbox().uncheck();
    await expect(
      pageObjects.manageIntegrationsTable.getReviewModalAutoInstallCheckbox()
    ).not.toBeChecked();

    const approveRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_COMPLETED.integrationId}/approve`) &&
        req.method() === 'POST'
    );
    await pageObjects.manageIntegrationsTable.getReviewApproveInstallButton().click();
    await approveRequest;
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeHidden();
    expect(installIntentDownloadCount).toBe(0);
  });

  test('closing the Review & Approve modal via Cancel dismisses it', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();
    await pageObjects.manageIntegrationsTable.getReviewModalCancelButton().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeHidden();
  });

  test('Install calls the download and install APIs then shows success', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_APPROVED]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await page.route(
      `**/api/automatic_import/integrations/${MOCK_APPROVED.integrationId}/download*`,
      (route) =>
        route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/zip' },
          body: Buffer.from('PK'),
        })
    );
    await page.route('**/api/fleet/epm/packages', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

    const downloadRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_APPROVED.integrationId}/download`) &&
        req.method() === 'GET'
    );
    const installRequest = page.waitForRequest(
      (req) => req.url().includes('/api/fleet/epm/packages') && req.method() === 'POST'
    );

    await pageObjects.manageIntegrationsTable.openActionsMenu('Approved Integration');
    await pageObjects.manageIntegrationsTable.getInstallMenuItem().click();

    await downloadRequest;
    await installRequest;
    await expect(pageObjects.manageIntegrationsTable.getTable()).toBeVisible();
  });

  test('Download .zip calls the download API', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}/download`,
      (route) =>
        route.fulfill({
          status: 200,
          headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${MOCK_COMPLETED.integrationId}.zip"`,
          },
          body: Buffer.from('PK'),
        })
    );

    const downloadRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_COMPLETED.integrationId}/download`) &&
        req.method() === 'GET'
    );

    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getDownloadZipMenuItem().click();

    await downloadRequest;
    await expect(pageObjects.manageIntegrationsTable.getTable()).toBeVisible();
  });

  test('Edit navigates to the edit page for the integration', async ({ page, pageObjects }) => {
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getEditMenuItem().click();
    await expect(page).toHaveURL(/\/edit\/int-completed/);
  });

  test('confirming delete calls the DELETE API and removes the row', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_PENDING]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await page.route(
      `**/api/automatic_import/integrations/${MOCK_PENDING.integrationId}`,
      (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        } else {
          route.continue();
        }
      }
    );
    await page.route('**/api/automatic_import/integrations', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await pageObjects.manageIntegrationsTable.getDeleteMenuItem().click();
    await pageObjects.manageIntegrationsTable.getDeleteConfirmButton().click();

    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Pending Integration')
    ).toBeHidden();
  });

  test('status filter shows only rows matching the selected status', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.getStatusFilterButton().click();
    await page.getByRole('option', { name: 'In progress' }).click();
    await pageObjects.manageIntegrationsTable.getStatusFilterButton().click();

    await expect(pageObjects.manageIntegrationsTable.getTableRows()).toHaveCount(1);
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Pending Integration')
    ).toBeVisible();
  });

  test('actions filter shows only rows matching the selected action', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.getActionsFilterButton().click();
    await page.getByRole('option', { name: 'Review & Approve' }).click();
    await pageObjects.manageIntegrationsTable.getActionsFilterButton().click();

    await expect(pageObjects.manageIntegrationsTable.getTableRows()).toHaveCount(1);
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Completed Integration')
    ).toBeVisible();
  });

  test('shows Fail status badge for failed and cancelled integrations', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_FAILED, MOCK_CANCELLED]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Failed Integration')
    ).toContainText('Fail');
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Cancelled Integration')
    ).toContainText('Fail');
  });

  test('selecting a row shows bulk delete button and deletes on confirm', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_PENDING, MOCK_COMPLETED]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await test.step('select row — bulk delete button appears', async () => {
      await pageObjects.manageIntegrationsTable.getRowCheckbox('Pending Integration').click();
      await expect(pageObjects.manageIntegrationsTable.getBulkDeleteButton()).toBeVisible();
    });

    await test.step('bulk delete calls API and removes the row', async () => {
      await page.route(
        `**/api/automatic_import/integrations/${MOCK_PENDING.integrationId}`,
        (route) => {
          if (route.request().method() === 'DELETE') {
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
          } else {
            route.continue();
          }
        }
      );
      await page.route('**/api/automatic_import/integrations', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([MOCK_COMPLETED]),
        })
      );

      await pageObjects.manageIntegrationsTable.getBulkDeleteButton().click();
      await expect(pageObjects.manageIntegrationsTable.getTableRows()).toHaveCount(1);
      await expect(
        pageObjects.manageIntegrationsTable.getRowByTitle('Completed Integration')
      ).toBeVisible();
    });
  });

  test('selecting an approved row shows the bulk install button', async ({ pageObjects }) => {
    await pageObjects.manageIntegrationsTable.getRowCheckbox('Approved Integration').click();
    await expect(pageObjects.manageIntegrationsTable.getBulkInstallButton()).toBeVisible();
  });

  test('bulk install button is hidden when only non-approved rows are selected', async ({
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.getRowCheckbox('Pending Integration').click();
    await expect(pageObjects.manageIntegrationsTable.getBulkInstallButton()).toBeDisabled();
  });

  test('clicking the integration title navigates to the edit page', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.getTitleLink('Completed Integration').click();
    await expect(page).toHaveURL(/\/edit\/int-completed/);
  });

  test('table renders rows in the order returned by the API', async ({ pageObjects }) => {
    const rowTexts = await pageObjects.manageIntegrationsTable.getTableRows().allTextContents();
    expect(rowTexts[0]).toContain('Pending Integration');
    expect(rowTexts[1]).toContain('Completed Integration');
    expect(rowTexts[2]).toContain('Approved Integration');
  });

  test('shows error callout when the integrations API returns an error', async ({
    page,
    pageObjects,
  }) => {
    await page.unroute('**/api/automatic_import/integrations');
    await page.route('**/api/automatic_import/integrations', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    );
    await pageObjects.manageIntegrationsTable.navigateToEmpty();
    await expect(pageObjects.manageIntegrationsTable.getErrorCallout()).toBeVisible({
      timeout: 15000,
    });
  });

  test('Install is disabled when the same version is already installed', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_APPROVED]);
    await page.unroute('**/api/fleet/epm/packages**');
    await page.route('**/api/fleet/epm/packages**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              name: MOCK_APPROVED.integrationId,
              version: MOCK_APPROVED.version,
              status: 'installed',
            },
          ],
        }),
      })
    );
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Approved Integration');
    await expect(pageObjects.manageIntegrationsTable.getInstallMenuItem()).toBeDisabled();
  });

  test('version field shows inline error on blur with an invalid value', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();

    const versionInput = pageObjects.manageIntegrationsTable.getReviewModalVersionInput();
    await versionInput.fill('not-a-version');
    await versionInput.blur();
    await expect(
      page.getByText('Enter a valid semantic version (for example, 1.0.0).')
    ).toBeVisible();
  });

  test('version 0.0.0 is blocked with an explicit validation error', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();

    const versionInput = pageObjects.manageIntegrationsTable.getReviewModalVersionInput();
    await versionInput.fill('0.0.0');
    await versionInput.blur();
    await expect(page.getByText('Version 0.0.0 is not allowed.')).toBeVisible();
  });

  test('Review modal shows data stream rows returned by the API', async ({ page, pageObjects }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            integrationResponse: {
              title: 'Completed Integration',
              version: '1.0.0',
              dataStreams: [
                {
                  dataStreamId: 'ds-audit',
                  title: 'Audit Logs',
                  status: 'completed',
                  inputTypes: [{ name: 'filestream' }],
                },
                {
                  dataStreamId: 'ds-events',
                  title: 'System Events',
                  status: 'completed',
                  inputTypes: [{ name: 'winlog' }],
                },
              ],
            },
          }),
        })
    );
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();

    const modal = pageObjects.manageIntegrationsTable.getReviewApproveModal();
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Audit Logs')).toBeVisible();
    await expect(modal.getByText('System Events')).toBeVisible();
  });

  test('Approve button is disabled and category help text is shown when no category is selected', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await page.route('**/api/fleet/epm/categories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'security', title: 'Security', count: 1 }] }),
      })
    );
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();

    await pageObjects.manageIntegrationsTable.getReviewModalVersionInput().fill('1.0.0');
    await expect(
      pageObjects.manageIntegrationsTable.getReviewApproveInstallButton()
    ).toBeDisabled();
    await expect(page.getByText('Select at least one category.')).toBeVisible();
  });

  test('shows Approved badge in the Approval Status column for approved integrations', async ({
    pageObjects,
  }) => {
    await expect(
      pageObjects.manageIntegrationsTable
        .getRowByTitle('Approved Integration')
        .getByText('Approved', { exact: true })
    ).toBeVisible();
  });

  test('actions filter by Approved shows only approved integrations', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.getActionsFilterButton().click();
    await page.getByRole('option', { name: 'Approved', exact: true }).click();
    await pageObjects.manageIntegrationsTable.getActionsFilterButton().click();

    await expect(pageObjects.manageIntegrationsTable.getTableRows()).toHaveCount(1);
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Approved Integration')
    ).toBeVisible();
  });

  test('bulk install triggers download and install APIs for each selected approved row', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_APPROVED]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await page.route(
      `**/api/automatic_import/integrations/${MOCK_APPROVED.integrationId}/download*`,
      (route) =>
        route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/zip' },
          body: Buffer.from('PK'),
        })
    );
    await page.route('**/api/fleet/epm/packages', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } else {
        route.continue();
      }
    });

    const downloadRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/integrations/${MOCK_APPROVED.integrationId}/download`) &&
        req.method() === 'GET'
    );
    const installRequest = page.waitForRequest(
      (req) => req.url().includes('/api/fleet/epm/packages') && req.method() === 'POST'
    );

    await pageObjects.manageIntegrationsTable.getRowCheckbox('Approved Integration').click();
    await pageObjects.manageIntegrationsTable.getBulkInstallButton().click();

    await downloadRequest;
    await installRequest;
    await expect(pageObjects.manageIntegrationsTable.getTable()).toBeVisible();
  });

  test('bulk install is disabled when a mix of approved and non-approved rows are selected', async ({
    pageObjects,
  }) => {
    await pageObjects.manageIntegrationsTable.getRowCheckbox('Approved Integration').click();
    await pageObjects.manageIntegrationsTable.getRowCheckbox('Pending Integration').click();
    await expect(pageObjects.manageIntegrationsTable.getBulkInstallButton()).toBeDisabled();
  });

  test('Review modal shows an error when fetching integration details fails', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}`,
      (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        })
    );
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();

    const modal = pageObjects.manageIntegrationsTable.getReviewApproveModal();
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('manageIntegrationReviewError')).toBeVisible();
  });

  test('Review modal shows an inline error when the approve API fails', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_COMPLETED]);
    await mockIntegrationDetails(page, MOCK_COMPLETED.integrationId);
    await page.route('**/api/fleet/epm/categories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'security', title: 'Security', count: 1 }] }),
      })
    );
    await page.route(
      `**/api/automatic_import/integrations/${MOCK_COMPLETED.integrationId}/approve`,
      (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Approval failed' }),
        })
    );
    await pageObjects.manageIntegrationsTable.navigateTo();
    await pageObjects.manageIntegrationsTable.openActionsMenu('Completed Integration');
    await pageObjects.manageIntegrationsTable.getReviewApproveMenuItem().click();
    await expect(pageObjects.manageIntegrationsTable.getReviewApproveModal()).toBeVisible();

    await pageObjects.manageIntegrationsTable.getReviewModalVersionInput().fill('1.0.0');
    const categoryInput = pageObjects.manageIntegrationsTable
      .getReviewModalCategoriesComboBox()
      .locator('input');
    await categoryInput.click();
    await categoryInput.press('ArrowDown');
    await categoryInput.press('Enter');

    await pageObjects.manageIntegrationsTable.getReviewModalAutoInstallCheckbox().uncheck();
    await pageObjects.manageIntegrationsTable.getReviewApproveInstallButton().click();

    const modal = pageObjects.manageIntegrationsTable.getReviewApproveModal();
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('manageIntegrationReviewError')).toBeVisible();
  });

  test('shows a toast error and keeps the row when delete API fails', async ({
    page,
    pageObjects,
  }) => {
    await mockIntegrationsList(page, [MOCK_PENDING]);
    await pageObjects.manageIntegrationsTable.navigateTo();

    await page.route(
      `**/api/automatic_import/integrations/${MOCK_PENDING.integrationId}`,
      (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Delete failed' }),
          });
        } else {
          route.continue();
        }
      }
    );

    await pageObjects.manageIntegrationsTable.openActionsMenu('Pending Integration');
    await pageObjects.manageIntegrationsTable.getDeleteMenuItem().click();
    await pageObjects.manageIntegrationsTable.getDeleteConfirmButton().click();

    await expect(page.getByTestId('globalToastList')).toContainText('Failed to delete integration');
    await expect(
      pageObjects.manageIntegrationsTable.getRowByTitle('Pending Integration')
    ).toBeVisible();
  });
});
