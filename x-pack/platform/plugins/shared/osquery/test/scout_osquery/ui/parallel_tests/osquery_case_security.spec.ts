/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { runAddLiveQueryResultToCase } from '../helpers/case_flows';

test.describe(
  'Osquery results attached to Security cases',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    test('adds a live query result to a Security case from history', async ({
      browserAuth,
      esClient,
      page,
      pageObjects,
      apiServices,
    }) => {
      // 4 min: live query + case attach.
      test.setTimeout(240_000);

      const caseId = await runAddLiveQueryResultToCase({
        apiServices,
        browserAuth,
        esClient,
        page,
        pageObjects,
        caseOwner: 'securitySolution',
        caseTitlePrefix: 'scout-sec-case',
      });

      await apiServices.cases.delete([caseId]);
    });
  }
);
