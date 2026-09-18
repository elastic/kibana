/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RoleSessionCredentials } from '@kbn/scout';
import {
  NIGHTSHIFT_MANAGER_ROLE,
  apiTest,
  cleanupSources,
  createSource,
  createTestIndex,
  deleteSource,
  deleteTestIndex,
  getSource,
  testIndexName,
  uniqueSuffix,
} from '../fixtures';

const TITLE_PREFIX = 'scout-sources-validation';

apiTest.describe(
  'POST /internal/nightshift/sources validation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const suffix = uniqueSuffix();
    const index = testIndexName(suffix);
    let manager: RoleSessionCredentials;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      manager = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGER_ROLE);
      await createTestIndex(esClient, index);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await cleanupSources(apiClient, manager.cookieHeader, `${TITLE_PREFIX}-${suffix}`);
      await deleteTestIndex(esClient, index);
    });

    const rejected = [
      ['a query that does not parse', 'FROM logs-* | WHERE', 'Invalid ES|QL query'],
      ['a first command that is not FROM or TS', 'ROW a = 1', 'must start with FROM or TS'],
      ['EVAL', `FROM ${index} | EVAL x = 1`, 'Command "EVAL" is not allowed'],
      ['STATS', `FROM ${index} | STATS c = COUNT(*)`, 'Command "STATS" is not allowed'],
      ['LIMIT', `FROM ${index} | LIMIT 10`, 'Command "LIMIT" is not allowed'],
      ['METADATA', `FROM ${index} METADATA _id`, 'METADATA is not allowed'],
      [
        'a remote cluster prefix',
        `FROM remote:${index}`,
        'Remote cluster references are not allowed',
      ],
    ] as const;

    for (const [label, esql, message] of rejected) {
      apiTest(`rejects ${label} with a 400`, async ({ apiClient }) => {
        const response = await createSource(apiClient, manager.cookieHeader, {
          title: `${TITLE_PREFIX}-${suffix}`,
          esql,
        });
        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toContain(message);
      });
    }

    apiTest('rejects a field ES cannot resolve on an existing index', async ({ apiClient }) => {
      const response = await createSource(apiClient, manager.cookieHeader, {
        title: `${TITLE_PREFIX}-${suffix}`,
        esql: `FROM ${index} | WHERE nope_field > 1`,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('ES|QL query cannot be executed');
    });

    apiTest('rejects a body without a title', async ({ apiClient }) => {
      const response = await createSource(apiClient, manager.cookieHeader, {
        esql: `FROM ${index}`,
      } as never);
      expect(response).toHaveStatusCode(400);
    });

    apiTest('accepts FROM with WHERE filters', async ({ apiClient }) => {
      const response = await createSource(apiClient, manager.cookieHeader, {
        title: `${TITLE_PREFIX}-${suffix}-from`,
        esql: `FROM ${index} | WHERE status >= 500 | WHERE host.name == "web-1"`,
      });
      expect(response).toHaveStatusCode(200);
      await deleteSource(apiClient, manager.cookieHeader, response.body.source.id);
    });

    // TS on a plain index fails at LIMIT 0, so use a pattern that matches nothing yet: a source
    // whose indices do not exist is accepted by design.
    apiTest('accepts TS over a pattern with no indices yet', async ({ apiClient }) => {
      const response = await createSource(apiClient, manager.cookieHeader, {
        title: `${TITLE_PREFIX}-${suffix}-ts`,
        esql: `TS metrics-nightshift-none-${suffix}-*`,
      });
      expect(response).toHaveStatusCode(200);
      await deleteSource(apiClient, manager.cookieHeader, response.body.source.id);
    });

    // With nothing behind the pattern ES cannot resolve `status` either; the source is still
    // accepted and reports healthy until data shows up.
    apiTest('accepts FROM over a pattern with no indices yet', async ({ apiClient }) => {
      const response = await createSource(apiClient, manager.cookieHeader, {
        title: `${TITLE_PREFIX}-${suffix}-none`,
        esql: `FROM logs-nightshift-none-${suffix}-* | WHERE status >= 500`,
      });
      expect(response).toHaveStatusCode(200);

      const fetched = await getSource(apiClient, manager.cookieHeader, response.body.source.id);
      expect(fetched.body.health).toBe('ok');

      await deleteSource(apiClient, manager.cookieHeader, response.body.source.id);
    });
  }
);
