/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { runAddLiveQueryResultToCase } from '../helpers/case_flows';

// Observability cases owner 403 on serverless security — stateful only (see osquery_case_security).
const statefulOnlyTags = tags.stateful.classic;

test.describe('Osquery results attached to Observability cases', { tag: statefulOnlyTags }, () => {
  test('adds a live query result to an Observability case from history', async ({
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
      caseOwner: 'observability',
      caseTitlePrefix: 'scout-oblt-case',
    });

    await apiServices.cases.delete([caseId]);
  });
});
