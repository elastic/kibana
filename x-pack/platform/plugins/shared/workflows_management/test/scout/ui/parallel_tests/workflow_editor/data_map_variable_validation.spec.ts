/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import {
  getDataMapWithInvalidVariable,
  getDataMapWithItemAndIndex,
} from '../../fixtures/workflows';

test.describe(
  'Variable validation: data.map item and index bindings',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
    });

    test('item and index references inside data.map with.fields are valid', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getDataMapWithItemAndIndex());
      await expect(accordion).toContainText('No validation errors');
    });

    test('invalid variable inside data.map with.fields is still flagged', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getDataMapWithInvalidVariable());

      await expect(accordion.getByText('Variable nonexistent.field is invalid')).toBeVisible();
      await expect(accordion).not.toContainText('Variable item.title is invalid');
    });
  }
);
