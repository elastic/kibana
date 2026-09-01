/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  createRuntimeFieldFromEditor,
  spaceTest,
} from '../fixtures';

const RUNTIME_FIELD_NAME = 'runtimefield';
const RENAMED_RUNTIME_FIELD_NAME = 'runtimefield2';
const RUNTIME_FIELD_VALUE = 'abc';

spaceTest.describe('Lens runtime fields', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);
  spaceTest.beforeEach(suiteSetup.beforeEach);
  spaceTest.afterAll(suiteSetup.afterAll);

  // The four FTR tests were one ordered journey sharing the same runtime field and editor state.
  spaceTest(
    'creates, filters, edits, and removes a runtime field',
    async ({ page, pageObjects }) => {
      const { filterBar, lens } = pageObjects;

      await lens.switchToVisualization('lnsDatatable');

      await spaceTest.step('add a runtime field and use it in the datatable', async () => {
        await lens.fields.openCreateFieldEditor();
        await createRuntimeFieldFromEditor(
          page,
          RUNTIME_FIELD_NAME,
          `emit('${RUNTIME_FIELD_VALUE}')`
        );
        await lens.fields.waitForFieldList();
        await lens.dragDrop.searchField('runtime');
        await expect(lens.fields.availableField(RUNTIME_FIELD_NAME)).toBeVisible();

        await lens.dragFieldToWorkspace(RUNTIME_FIELD_NAME, 'lnsVisualizationContainer');

        await expect(
          lens.datatable.getHeaderLocator(`Top 9 values of ${RUNTIME_FIELD_NAME}`)
        ).toBeVisible();
        await expect(lens.datatable.getCellLocator()).toContainText(RUNTIME_FIELD_VALUE);
      });

      await spaceTest.step('filter out the runtime field value', async () => {
        await lens.datatable.filterOutCell();
        await expect(lens.workspace.noResults).toBeVisible();

        await filterBar.removeAllFilters();
        await expect(lens.workspace.noResults).toBeHidden();
        await expect(lens.datatable.getCellLocator()).toContainText(RUNTIME_FIELD_VALUE);
      });

      await spaceTest.step('rename the runtime field and use the renamed field', async () => {
        await lens.fields.openEditField(RUNTIME_FIELD_NAME);
        await lens.fields.renameOpenField(RENAMED_RUNTIME_FIELD_NAME);
        await lens.dragDrop.searchField('runtime');
        await expect(lens.fields.availableField(RENAMED_RUNTIME_FIELD_NAME)).toBeVisible();

        await lens.dragDrop.dragFieldToDimensionTrigger(
          RENAMED_RUNTIME_FIELD_NAME,
          'lnsDatatable_rows > lns-dimensionTrigger'
        );
        await lens.waitForVisualization('lnsVisualizationContainer');

        await expect(
          lens.datatable.getHeaderLocator(`Top 9 values of ${RENAMED_RUNTIME_FIELD_NAME}`)
        ).toBeVisible();
        await expect(lens.datatable.getCellLocator()).toContainText(RUNTIME_FIELD_VALUE);
      });

      await spaceTest.step('remove the runtime field', async () => {
        await lens.fields.removeField(RENAMED_RUNTIME_FIELD_NAME);
        await expect(lens.fields.availableField(RENAMED_RUNTIME_FIELD_NAME)).toBeHidden();
      });
    }
  );
});
