/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../fixtures';
import { PUBLIC_API_HEADERS } from '../fixtures/constants';

const VIEW_PREFIX = '$.';
const viewName = (streamName: string) => `${VIEW_PREFIX}${streamName}`;

apiTest.describe(
  'Query stream isolation - child query streams excluded from parent views',
  { tag: [...tags.stateful.classic] },
  () => {
    // Use logs.otel as root - it's guaranteed to exist after enableStreams() in fresh installs.
    // Stream names must be exactly one level deep when forking from 'logs.otel'.
    const rootStream = 'logs.otel';
    const parentStream = `${rootStream}.qs-iso`;
    const queryChildName = `${parentStream}.qchild`;
    const nestedQueryChildName = `${queryChildName}.nested`;

    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.streamsTest.enableQueryStreams();

      await apiServices.streamsTest.forkStream(rootStream, parentStream, {
        field: 'service.name',
        eq: 'qs-isolation-test',
      });

      // Wired streams will have views created automatically in the future.
      // For now, create one manually so the parent reference validation passes.
      const parentView = viewName(parentStream);
      await apiServices.streamsTest.createEsqlView(parentView, `FROM ${parentStream}`);

      // Create query streams via kbnClient (superuser) because the PUT /_query/view
      // ES API requires cluster privileges not available to the streamsAdmin test role.
      await apiServices.streamsTest.createQueryStream(
        queryChildName,
        `FROM ${parentView} | STATS error_count = COUNT(*) BY \`log.level\``
      );

      await apiServices.streamsTest.createQueryStream(
        nestedQueryChildName,
        `FROM ${viewName(
          queryChildName
        )} | EVAL doubled = error_count * 2 | KEEP doubled, \`log.level\``
      );
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.streamsTest.deleteEsqlView(viewName(parentStream));
      await apiServices.streamsTest.cleanupTestStreams(parentStream);
      await apiServices.streamsTest.disableQueryStreams();
    });

    // Helper to run ES|QL and return parsed columns/values
    async function runEsql(
      esClient: { esql: { query: Function } },
      query: string
    ): Promise<{ columns: Array<{ name: string }>; values: unknown[][] }> {
      const response = await esClient.esql.query({ query, format: 'json' }, { meta: true });
      const body = response.body as unknown as {
        columns: Array<{ name: string }>;
        values: unknown[][];
      };
      return { columns: body.columns, values: body.values };
    }

    // Verify query streams were created
    // Note: GET /api/streams/{name} for query streams reads the ES|QL view using the
    // scoped ES client, which requires cluster privileges the streamsAdmin role lacks.
    // We verify via the list API (which doesn't read views) and direct ES|QL queries.

    apiTest('should include query streams in the streams list', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.get('api/streams', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      const streamNames = body.streams.map((s: { name: string }) => s.name);
      expect(streamNames).toContain(queryChildName);
      expect(streamNames).toContain(nestedQueryChildName);
    });

    // Schema isolation via $.prefix
    // These tests verify that query stream columns (error_count, doubled) do not leak
    // into the parent ingest stream's schema. ES|QL returns column metadata even for
    // empty results, so data presence is not required for schema isolation assertions.

    apiTest(
      'parent ingest stream schema does not include query stream columns',
      async ({ esClient }) => {
        const result = await runEsql(esClient, `FROM ${parentStream} | LIMIT 0`);

        const columnNames = result.columns.map((c) => c.name);
        expect(columnNames).not.toContain('error_count');
        expect(columnNames).not.toContain('doubled');
      }
    );

    apiTest('parent wildcard does not resolve query stream ES|QL views', async ({ esClient }) => {
      const result = await runEsql(esClient, `FROM ${parentStream}, ${parentStream}.* | LIMIT 0`);

      const columnNames = result.columns.map((c) => c.name);
      expect(columnNames).not.toContain('error_count');
      expect(columnNames).not.toContain('doubled');
    });

    apiTest('query stream view exposes its own transformed columns', async ({ esClient }) => {
      const result = await runEsql(esClient, `FROM ${viewName(queryChildName)} | LIMIT 0`);

      const columnNames = result.columns.map((c) => c.name);
      expect(columnNames).toContain('error_count');
      expect(columnNames).toContain('log.level');
    });

    // Nested query stream hierarchy

    apiTest(
      'nested query stream exposes its own columns, not parent query stream columns',
      async ({ esClient }) => {
        const result = await runEsql(esClient, `FROM ${viewName(nestedQueryChildName)} | LIMIT 0`);

        const columnNames = result.columns.map((c) => c.name);
        expect(columnNames).toContain('doubled');
        expect(columnNames).toContain('log.level');
        expect(columnNames).not.toContain('error_count');
      }
    );

    apiTest('parent query stream schema is unaffected by nested child', async ({ esClient }) => {
      const result = await runEsql(esClient, `FROM ${viewName(queryChildName)} | LIMIT 0`);

      const columnNames = result.columns.map((c) => c.name);
      expect(columnNames).toContain('error_count');
      expect(columnNames).not.toContain('doubled');
    });

    apiTest(
      'ingest parent remains isolated from all query stream descendants',
      async ({ esClient }) => {
        const result = await runEsql(esClient, `FROM ${parentStream}, ${parentStream}.* | LIMIT 0`);

        const columnNames = result.columns.map((c) => c.name);
        expect(columnNames).not.toContain('error_count');
        expect(columnNames).not.toContain('doubled');
      }
    );

    // Wired sibling deletion preserves query_streams on parent

    apiTest(
      'deleting a wired sibling preserves query stream references on parent',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...PUBLIC_API_HEADERS, ...cookieHeader };
        const wiredSibling = `${parentStream}.wired-sib`;

        // Fork a wired sibling under the same parent
        const { statusCode: forkStatus } = await apiClient.post(
          `api/streams/${parentStream}/_fork`,
          {
            headers,
            body: {
              stream: { name: wiredSibling },
              where: { field: 'service.name', eq: 'wired-sibling-test' },
              status: 'enabled',
            },
            responseType: 'json',
          }
        );
        expect(forkStatus).toBe(200);

        // Verify parent has the query child before deletion
        const { body: before } = await apiClient.get(`api/streams/${parentStream}`, {
          headers,
          responseType: 'json',
        });
        expect(before.stream.query_streams?.map((ref: { name: string }) => ref.name)).toContain(
          queryChildName
        );

        // Delete the wired sibling — this triggers a cascading parent update
        const { statusCode: deleteStatus } = await apiClient.delete(`api/streams/${wiredSibling}`, {
          headers,
          responseType: 'json',
        });
        expect(deleteStatus).toBe(200);

        // Confirm the sibling is actually gone
        const { statusCode: siblingStatus } = await apiClient.get(`api/streams/${wiredSibling}`, {
          headers,
          responseType: 'json',
        });
        expect(siblingStatus).toBe(404);

        // Verify the cascading parent update preserved query_streams and removed routing
        const { body: after } = await apiClient.get(`api/streams/${parentStream}`, {
          headers,
          responseType: 'json',
        });
        expect(after.stream.query_streams?.map((ref: { name: string }) => ref.name)).toContain(
          queryChildName
        );
        const routingDestinations = after.stream.ingest.wired.routing.map(
          (r: { destination: string }) => r.destination
        );
        expect(routingDestinations).not.toContain(wiredSibling);
      }
    );

    // Deletion

    apiTest('should delete a query stream via API', async ({ esClient, apiServices }) => {
      await apiServices.streamsTest.deleteStream(nestedQueryChildName);

      // After deletion, querying the deleted view should throw
      await expect(
        esClient.esql.query({
          query: `FROM ${viewName(nestedQueryChildName)} | LIMIT 0`,
          format: 'json',
        })
      ).rejects.toThrow(/Unknown index/i);
    });
  }
);
