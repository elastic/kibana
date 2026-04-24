/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { runAddLiveQueryResultToCase } from '../helpers/case_flows';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Osquery results attached to Security cases', { tag: localTags }, () => {
  test('adds a live query result to a Security case from history', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
    kbnClient,
  }) => {
    // 4 min: live query + case attach.
    test.setTimeout(240_000);

    const caseId = await runAddLiveQueryResultToCase({
      apiServices,
      browserAuth,
      kbnClient,
      page,
      pageObjects,
      caseOwner: 'securitySolution',
      caseTitlePrefix: 'scout-sec-case',
    });

    await apiServices.cases.delete([caseId]);
  });
});
