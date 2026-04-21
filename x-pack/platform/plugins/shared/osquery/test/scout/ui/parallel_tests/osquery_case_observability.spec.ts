/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { getMinimalLiveQuery } from '../../api/fixtures/constants';

const mkiTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Osquery results attached to Observability cases', { tag: mkiTags }, () => {
  test('adds a live query result to an Observability case from history', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(240_000);

    const live = await apiServices.osquery.liveQueries.create(
      getMinimalLiveQuery({
        query: 'SELECT * FROM os_version;',
        agent_all: true,
      })
    );
    const liveBody = live.data as { data: { action_id: string } };
    const actionId = liveBody.data.action_id;

    const caseTitle = `scout-oblt-case-${Date.now()}`;
    const createdCase = await apiServices.cases.create({
      title: caseTitle,
      tags: [],
      severity: 'low',
      description: 'scout',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true, extractObservables: true },
      owner: 'observability',
    });
    const caseId = createdCase.data.id;

    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryCasesPage.navigateToHistory();
    await pageObjects.osqueryCasesPage.openLiveQueryRowDetails(actionId);
    await pageObjects.osqueryCasesPage.addToCaseFromRowKebab(caseId);

    await expect(page.getByText(new RegExp(`Case ${caseTitle} updated`))).toBeVisible();
    await pageObjects.osqueryCasesPage.clickViewCaseFromToast();
    await pageObjects.osqueryCasesPage.expectOsqueryAttachmentVisible();
    await pageObjects.osqueryCasesPage.expectTextInCaseBody('SELECT * FROM os_version;');

    await apiServices.cases.delete([caseId]);
  });
});
