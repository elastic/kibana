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

/**
 * Parameterised owner for the "attach live query result to a case" flow.
 * Security Solution and Observability cases use different owner strings and
 * run on different deployment targets — the flow body is identical otherwise,
 * so the two spec files stay distinct for tag-set reasons but both call
 * `runAddLiveQueryResultToCase` with their owner.
 */
export type CaseOwner = 'securitySolution' | 'observability';

export interface RunAddLiveQueryResultToCaseParams {
  apiServices: OsqueryUiApiServicesFixture;
  browserAuth: OsqueryBrowserAuthFixture;
  kbnClient: KbnClient;
  page: ScoutPage;
  pageObjects: OsqueryUiTestFixtures['pageObjects'];
  caseOwner: CaseOwner;
  /** Prefix for the generated case title. Used for cleanup traceability. */
  caseTitlePrefix: string;
}

/**
 * Shared flow: submit a live query via API → poll unified-history for
 * completion → create a case with the specified owner → attach the query
 * result via the UI history page → assert the attachment surfaces in the
 * case body. Returns the created case id so callers can clean up in their
 * `afterAll`.
 *
 * The UI half of the flow is identical across owners — only the
 * `apiServices.cases.create(...)` body differs. Centralising here keeps the
 * two spec files down to fixture + tag + owner wiring.
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
  // Gate on agent-side completion so the history row has a populated result
  // set by the time the UI asserts on it.
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
  // Single-query submission: aggregate "Add to Case" renders in the results
  // header (no per-row kebab). Use `addToCaseFromRowKebab` for pack results.
  await pageObjects.osqueryCasesPage.addToCaseFromHeader(caseId);

  await expect(page.getByText(new RegExp(`Case ${caseTitle} updated`))).toBeVisible();
  await pageObjects.osqueryCasesPage.clickViewCaseFromToast();
  await pageObjects.osqueryCasesPage.expectOsqueryAttachmentVisible();
  await pageObjects.osqueryCasesPage.expectTextInCaseBody('SELECT * FROM os_version;');

  return caseId;
}
