/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type {
  OsqueryBrowserAuthFixture,
  OsqueryUiApiServicesFixture,
  OsqueryUiTestFixtures,
} from '../fixtures';
import { getMinimalLiveQuery } from '../../api/fixtures/constants';
import { mockFleetAgents, indexActionResponses, indexResultRows } from './data_loaders';

/** Case API owner for attach flow (`securitySolution` vs `observability`). */
export type CaseOwner = 'securitySolution' | 'observability';

export interface RunAddLiveQueryResultToCaseParams {
  apiServices: OsqueryUiApiServicesFixture;
  browserAuth: OsqueryBrowserAuthFixture;
  esClient: Client;
  page: ScoutPage;
  pageObjects: OsqueryUiTestFixtures['pageObjects'];
  caseOwner: CaseOwner;
  /** Case title prefix (cleanup / debugging). */
  caseTitlePrefix: string;
}

/**
 * Mock the agent picker → API live query → seed result docs → create case →
 * UI attach from history → assert body. Returns case id for caller cleanup.
 *
 * Tier-A: no real agent enrollment required. The Kibana route still writes the
 * action SO; the per-agent responses + result rows are seeded so the history
 * polling completes immediately. The agent picker is populated via
 * `mockFleetAgents` rather than writing to `.fleet-agents` directly.
 */
export async function runAddLiveQueryResultToCase({
  apiServices,
  browserAuth,
  esClient,
  page,
  pageObjects,
  caseOwner,
  caseTitlePrefix,
}: RunAddLiveQueryResultToCaseParams): Promise<string> {
  const { agents } = await mockFleetAgents(page, { count: 1 });

  // Tier-A: pass explicit `agent_ids` (NOT `agent_all: true`) so the server's
  // `parseAgentSelection` skips Fleet's `agentService.listAgents()` call
  // against `.fleet-agents`. That index does not exist without Fleet Server,
  // and `agent_all: true` would otherwise 500 with `index_not_found_exception`.
  const live = await apiServices.osquery.liveQueries.create(
    getMinimalLiveQuery({
      query: 'SELECT * FROM os_version;',
      agent_all: false,
      agent_ids: agents.map((a) => a.agentId),
    })
  );
  // Top-level umbrella id (used by the cases history row drill-down).
  const liveData = (
    live.data as {
      data: { action_id: string; queries?: Array<{ action_id: string }> };
    }
  ).data;
  const actionId = liveData.action_id;
  // Per-query id (used by the results grid filter — see submit_live_query.ts notes).
  const queryActionId = liveData.queries?.[0]?.action_id ?? actionId;

  await indexActionResponses(esClient, {
    actionId: queryActionId,
    agents,
    rowCountPerAgent: 1,
  });
  await indexResultRows(esClient, {
    actionId: queryActionId,
    agents,
    rows: [{ name: 'Linux', version: '5.15' }],
  });

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
