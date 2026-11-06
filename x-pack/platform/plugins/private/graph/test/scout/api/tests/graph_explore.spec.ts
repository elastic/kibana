/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

interface Vertex {
  field: string;
  term: string;
}

interface Connection {
  source: number;
  target: number;
}

interface GraphExploreResponseBody {
  resp: {
    vertices: Vertex[];
    connections: Connection[];
  };
}

apiTest.describe(
  'POST /internal/graph/graphExplore - secrepo data',
  { tag: testData.GRAPH_TAGS },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      cookieHeader = (await samlAuth.asInteractiveUser(testData.GRAPH_EXPLORE_ROLE)).cookieHeader;
      await esArchiver.loadIfNeeded(testData.SECREPO_ES_ARCHIVE);
    });

    apiTest('returns the expected vertices and connections', async ({ apiClient }) => {
      const response = await apiClient.post('/internal/graph/graphExplore', {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: {
          index: testData.SECREPO_INDEX,
          query: testData.SECREPO_GRAPH_EXPLORE_QUERY,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);

      const { vertices, connections } = (response.body as GraphExploreResponseBody).resp;

      const vertexLabels = new Set(vertices.map((v) => v.term));
      for (const expectedTerm of testData.EXPECTED_NODES) {
        expect(vertexLabels.has(expectedTerm), `Missing expected vertex "${expectedTerm}"`).toBe(
          true
        );
      }

      // The API returns directional connections (A -> B and B -> A as separate
      // records), while the UI dedupes them, so a strict count check here
      // would be brittle. Instead we assert the connection *contract*:
      //  1. Every returned connection is allowed by the expected adjacency map.
      //  2. Every expected undirected edge is present in the response.
      const observed = new Set<string>();
      for (const conn of connections) {
        const sourceTerm = vertices[conn.source].term;
        const targetTerm = vertices[conn.target].term;
        const allowed =
          testData.EXPECTED_CONNECTIONS[sourceTerm]?.[targetTerm] === true ||
          testData.EXPECTED_CONNECTIONS[targetTerm]?.[sourceTerm] === true;
        expect(allowed, `Unexpected connection between "${sourceTerm}" and "${targetTerm}"`).toBe(
          true
        );
        const [a, b] = [sourceTerm, targetTerm].sort();
        observed.add(`${a}|${b}`);
      }

      for (const [from, targets] of Object.entries(testData.EXPECTED_CONNECTIONS)) {
        for (const to of Object.keys(targets)) {
          const [a, b] = [from, to].sort();
          expect(observed.has(`${a}|${b}`), `Missing expected edge ${a} <-> ${b}`).toBe(true);
        }
      }
    });
  }
);
