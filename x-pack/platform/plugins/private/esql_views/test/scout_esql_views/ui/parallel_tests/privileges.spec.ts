/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createEsqlView, deleteEsqlViews } from '../fixtures/esql_views_api';
import {
  ESQL_VIEWS_CREATE_ROLE,
  ESQL_VIEWS_DELETE_ROLE,
  ESQL_VIEWS_NO_ACCESS_ROLE,
  ESQL_VIEWS_READ_ONLY_ROLE,
} from '../fixtures/esql_views_roles';
import { spaceTest } from '../fixtures';

const VIEW_NAME = `scout-esql-views-privileges-${randomUUID().slice(0, 8)}`;

spaceTest.describe('ES|QL Views privilege gating', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ esClient }) => {
    await createEsqlView(esClient, { name: VIEW_NAME, query: 'ROW value = 1' });
  });

  spaceTest.afterAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, [VIEW_NAME]);
  });

  spaceTest(
    'hides the management navigation and rejects direct navigation without read access',
    async ({ browserAuth, pageObjects }) => {
      const { esqlViews } = pageObjects;
      await browserAuth.loginWithCustomRole(ESQL_VIEWS_NO_ACCESS_ROLE);

      await esqlViews.gotoManagement();
      await expect(esqlViews.managementNavigationLink).toBeHidden();

      await esqlViews.gotoExpectUnavailable();
      await expect(esqlViews.managementLandingHeading).toBeVisible();
      await expect(esqlViews.table).toBeHidden();
      await expect(esqlViews.managementNavigationLink).toBeHidden();
    }
  );

  spaceTest(
    'shows the table without mutation controls with read-only access',
    async ({ browserAuth, pageObjects }) => {
      const { esqlViews } = pageObjects;
      await browserAuth.loginWithCustomRole(ESQL_VIEWS_READ_ONLY_ROLE);
      await esqlViews.goto();

      const row = esqlViews.getViewRow(VIEW_NAME);
      await expect(row).toBeVisible();
      await expect(esqlViews.createButton).toBeHidden();
      await expect(row.getByTestId('esqlViewsActionsButton')).toBeHidden();
      await expect(row.getByRole('checkbox')).toHaveCount(0);
    }
  );

  spaceTest(
    'shows create and edit controls without delete controls with create access',
    async ({ browserAuth, page, pageObjects }) => {
      const { esqlViews } = pageObjects;
      await browserAuth.loginWithCustomRole(ESQL_VIEWS_CREATE_ROLE);
      await esqlViews.goto();

      const row = esqlViews.getViewRow(VIEW_NAME);
      await expect(row).toBeVisible();
      await expect(esqlViews.createButton).toBeVisible();
      await expect(row.getByTestId('esqlViewsActionsButton')).toBeVisible();
      await expect(row.getByRole('checkbox')).toHaveCount(0);

      await esqlViews.openRowActions(VIEW_NAME);
      await expect(page.testSubj.locator('esqlViewsEditButton')).toBeVisible();
      await expect(page.testSubj.locator('esqlViewsDeleteButton')).toBeHidden();
    }
  );

  spaceTest(
    'shows delete controls without create or edit controls with delete access',
    async ({ browserAuth, page, pageObjects }) => {
      const { esqlViews } = pageObjects;
      await browserAuth.loginWithCustomRole(ESQL_VIEWS_DELETE_ROLE);
      await esqlViews.goto();

      const row = esqlViews.getViewRow(VIEW_NAME);
      await expect(row).toBeVisible();
      await expect(esqlViews.createButton).toBeHidden();
      await expect(row.getByRole('checkbox')).toBeVisible();

      await esqlViews.openRowActions(VIEW_NAME);
      await expect(page.testSubj.locator('esqlViewsDeleteButton')).toBeVisible();
      await expect(page.testSubj.locator('esqlViewsEditButton')).toBeHidden();

      await page.keyboard.press('Escape');
      await esqlViews.selectView(VIEW_NAME);
      await expect(page.testSubj.locator('esqlViewsBulkDeleteButton')).toBeVisible();
    }
  );
});
