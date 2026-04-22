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
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Osquery results attached to Security cases', { tag: localTags }, () => {
  test('adds a live query result to a Security case from history', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
    kbnClient,
  }) => {
    test.setTimeout(240_000);

    await waitForAtLeastOneAgentOnline(kbnClient);
    const live = await apiServices.osquery.liveQueries.create(
      getMinimalLiveQuery({
        query: 'SELECT * FROM os_version;',
        agent_all: true,
      })
    );
    const actionId = (live.data as { data: { action_id: string } }).data.action_id;

    const caseTitle = `scout-sec-case-${Date.now()}`;
    const createdCase = await apiServices.cases.create({
      title: caseTitle,
      tags: [],
      severity: 'low',
      description: 'scout',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true, extractObservables: true },
      owner: 'securitySolution',
    });
    const caseId = createdCase.data.id;

    await browserAuth.loginAsOsqueryPowerUser();
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
