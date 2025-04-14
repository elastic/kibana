/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDeprecationsContext } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SearchHit } from '@kbn/es-types';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { getLegacyRbacDeprecationsInfo } from './legacy_rbac';

let context: GetDeprecationsContext;
const esClient = elasticsearchClientMock.createScopedClusterClient();
const docsLinks = docLinksServiceMock.createSetupContract();

describe('getLegacyRbacDeprecationsInfo', () => {
  beforeEach(async () => {
    context = { esClient } as unknown as GetDeprecationsContext;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('does not return deprecations when there is no legacyRBACExemption usage', async () => {
    esClient.asCurrentUser.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
    });
    expect(await getLegacyRbacDeprecationsInfo(context, docsLinks)).toMatchInlineSnapshot(
      `Array []`
    );
  });

  test('does return deprecations when there is legacyRBACExemption usage', async () => {
    esClient.asCurrentUser.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [{} as SearchHit<unknown>],
      },
    });

    expect(await getLegacyRbacDeprecationsInfo(context, docsLinks)).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveActions": Object {
            "manualSteps": Array [
              "To identify the affected rules run the query in Dev Tools that is linked under Learn more.",
              "To use normal RBAC authorization, update the API key by editing the rule.",
            ],
          },
          "deprecationType": "feature",
          "documentationUrl": "https://www.elastic.co/guide/en/kibana/test-branch/breaking-changes-summary.html#breaking-legacy-rbac",
          "level": "warning",
          "message": "The legacy role-based action control exemption for alerting rules has been removed in future versions. This cluster has alerting rules triggering actions that rely on the legacy exemption. The rules will fail to trigger actions for alerts.",
          "title": "Legacy RBAC exemption",
        },
      ]
    `);
  });
});
