/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteEsqlViews, getEsqlView } from '../fixtures/esql_views_api';
import { spaceTest } from '../fixtures';

const VIEW_NAME = `scout-esql-views-crud-${randomUUID().slice(0, 8)}`;
const INITIAL_DESCRIPTION = 'Created through the management UI';
const INITIAL_QUERY = 'ROW value = 1';
const UPDATED_DESCRIPTION = 'Edited through the management UI';
const UPDATED_QUERY = 'ROW value = 2';

spaceTest.describe('ES|QL View create and edit', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, [VIEW_NAME]);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.esqlViews.goto();
  });

  spaceTest.afterAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, [VIEW_NAME]);
  });

  spaceTest('creates, edits, and validates a view', async ({ esClient, pageObjects }) => {
    const { esqlViews } = pageObjects;

    await esqlViews.openCreateFlyout();
    await esqlViews.fillForm({
      name: VIEW_NAME,
      description: INITIAL_DESCRIPTION,
      query: INITIAL_QUERY,
    });
    await esqlViews.saveForm();

    await expect(esqlViews.formFlyout).toBeHidden();
    await expect(esqlViews.getViewRow(VIEW_NAME)).toContainText(INITIAL_DESCRIPTION);
    await expect
      .poll(() => getEsqlView(esClient, VIEW_NAME))
      .toStrictEqual({
        name: VIEW_NAME,
        description: INITIAL_DESCRIPTION,
        query: INITIAL_QUERY,
      });

    await esqlViews.openEditFlyout(VIEW_NAME);
    await expect(esqlViews.nameInput).toHaveValue(VIEW_NAME);
    await expect(esqlViews.nameInput).toHaveAttribute('readonly', '');
    await expect(esqlViews.descriptionInput).toHaveValue(INITIAL_DESCRIPTION);
    expect(await esqlViews.codeEditor.getCodeEditorValueByTestSubj('esqlViewQueryEditor')).toBe(
      INITIAL_QUERY
    );

    await esqlViews.fillForm({
      description: UPDATED_DESCRIPTION,
      query: UPDATED_QUERY,
    });
    await esqlViews.saveForm();

    await expect(esqlViews.formFlyout).toBeHidden();
    await expect(esqlViews.getViewRow(VIEW_NAME)).toContainText(UPDATED_DESCRIPTION);
    await expect
      .poll(() => getEsqlView(esClient, VIEW_NAME))
      .toStrictEqual({
        name: VIEW_NAME,
        description: UPDATED_DESCRIPTION,
        query: UPDATED_QUERY,
      });

    await esqlViews.openEditFlyout(VIEW_NAME);
    await esqlViews.fillForm({ query: 'INVALID QUERY' });
    await esqlViews.saveForm();

    await expect(esqlViews.formFlyout).toContainText('Fix the ES|QL syntax:');
    await expect(esqlViews.formFlyout).toBeVisible();
    await expect
      .poll(() => getEsqlView(esClient, VIEW_NAME))
      .toStrictEqual({
        name: VIEW_NAME,
        description: UPDATED_DESCRIPTION,
        query: UPDATED_QUERY,
      });
  });
});
