/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type {
  OsqueryBrowserAuthFixture,
  OsqueryUiApiServicesFixture,
  OsqueryUiTestFixtures,
} from '../fixtures';
import { waitForAtLeastOneAgentOnline } from './fleet_agents';
import { waitForLiveQueryComplete } from './poll_live_query_history';
import { getMinimalLiveQuery } from '../../api/fixtures/constants';

/** Case API owner for attach flow (`securitySolution` vs `observability`). */
export type CaseOwner = 'securitySolution' | 'observability';

export interface RunAddLiveQueryResultToCaseParams {
  apiServices: OsqueryUiApiServicesFixture;
  browserAuth: OsqueryBrowserAuthFixture;
  kbnClient: KbnClient;
  page: ScoutPage;
  pageObjects: OsqueryUiTestFixtures['pageObjects'];
  caseOwner: CaseOwner;
  /** Case title prefix (cleanup / debugging). */
  caseTitlePrefix: string;
}

/**
 * API live query → wait complete → create case → UI attach from history → assert body.
 * Returns case id for caller cleanup.
 */
export async function runAddLiveQueryResultToCase({
  apiServices,
  browserAuth,
  kbnClient,
  page,
  pageObjects,
  caseOwner,
  caseTitlePrefix,
}: RunAddLiveQueryResultToCaseParams): Promise<string> {
  await waitForAtLeastOneAgentOnline(kbnClient);

  const live = await apiServices.osquery.liveQueries.create(
    getMinimalLiveQuery({
      query: 'SELECT * FROM os_version;',
      agent_all: true,
    })
  );
  const actionId = (live.data as { data: { action_id: string } }).data.action_id;
  // Wait for completion so history row has results before UI steps.
  await waitForLiveQueryComplete(kbnClient, actionId);

  const caseTitle = `${caseTitlePrefix}-${Date.now()}`;
  const createdCase = await apiServices.cases.create({
    title: caseTitle,
    tags: [],
    severity: 'low',
    description: 'scout',
    assignees: [],
    connector: { id: 'none', name: 'none', type: '.none', fields: null },
    settings: { syncAlerts: true, extractObservables: true },
    owner: caseOwner,
  });
  const caseId = createdCase.data.id;

  await browserAuth.loginAsOsqueryPowerUser();
  await pageObjects.osqueryCasesPage.navigateToHistory();
  await pageObjects.osqueryCasesPage.openLiveQueryRowDetails(actionId);
  // Single-query results: Add to Case in header (pack flows use row kebab helper).
  await pageObjects.osqueryCasesPage.addToCaseFromHeader(caseId);

  await expect(page.getByText(new RegExp(`Case ${caseTitle} updated`))).toBeVisible();
  await pageObjects.osqueryCasesPage.clickViewCaseFromToast();
  await pageObjects.osqueryCasesPage.expectOsqueryAttachmentVisible();
  await pageObjects.osqueryCasesPage.expectTextInCaseBody('SELECT * FROM os_version;');

  return caseId;
}
