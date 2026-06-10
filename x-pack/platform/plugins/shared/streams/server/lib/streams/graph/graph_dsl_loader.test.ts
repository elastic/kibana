/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { graphDslToDefinitions, graphDslNodeIds } from './graph_dsl_loader';
import type { GraphDsl } from './graph_dsl_loader';

// The worked nginx topology from streams_graph_dsl.md
const nginxTopology: GraphDsl = {
  name: 'serviceA-topology',
  sources: {
    otlp_in: { type: 'otlp' },
  },
  pipelines: {
    serviceA_parse: {
      steps: [],
    },
  },
  destinations: {
    nginx_es: { type: 'elasticsearch', lifecycle: { dsl: { data_retention: '30d' } } },
    webserver_es: { type: 'elasticsearch' },
    serviceA_es: { type: 'elasticsearch', lifecycle: { dsl: { data_retention: '7d' } } },
  },
  routing: [
    { from: 'otlp_in', to: 'serviceA_parse', where: { field: 'service.name', eq: 'serviceA' } },
    { from: 'serviceA_parse', to: 'webserver_es', where: { field: 'http.url', exists: true } },
    { from: 'serviceA_parse', to: 'nginx_es', where: { field: 'log.file.path', contains: 'nginx' } },
    { from: 'serviceA_parse', to: 'serviceA_es' }, // unconditional fallthrough — no where → always
  ],
};

describe('graphDslToDefinitions', () => {
  it('produces one request per node', () => {
    const results = graphDslToDefinitions(nginxTopology);
    expect(results.map((r) => r.name)).toEqual([
      'otlp_in',
      'serviceA_parse',
      'nginx_es',
      'webserver_es',
      'serviceA_es',
    ]);
  });

  it('all requests are graph-typed', () => {
    const results = graphDslToDefinitions(nginxTopology);
    for (const { request } of results) {
      expect(request.stream.type).toBe('graph');
    }
  });

  it('maps routing edges to the correct source node', () => {
    const results = graphDslToDefinitions(nginxTopology);
    const otlpIn = results.find((r) => r.name === 'otlp_in')!;
    expect(otlpIn.request.stream.ingest.graph.routing).toHaveLength(1);
    expect(otlpIn.request.stream.ingest.graph.routing[0].destination).toBe('serviceA_parse');

    const parse = results.find((r) => r.name === 'serviceA_parse')!;
    expect(parse.request.stream.ingest.graph.routing).toHaveLength(3);
    expect(parse.request.stream.ingest.graph.routing.map((r) => r.destination)).toEqual([
      'webserver_es',
      'nginx_es',
      'serviceA_es',
    ]);
    // The fallthrough (no where in DSL) must map to { always: {} }, NOT { never: {} }
    const fallthrough = parse.request.stream.ingest.graph.routing[2];
    expect(fallthrough.where).toEqual({ always: {} });
  });

  it('destination nodes have no outbound routing', () => {
    const results = graphDslToDefinitions(nginxTopology);
    for (const dest of ['nginx_es', 'webserver_es', 'serviceA_es']) {
      const node = results.find((r) => r.name === dest)!;
      expect(node.request.stream.ingest.graph.routing).toHaveLength(0);
    }
  });

  it('per-node lifecycle overrides are preserved', () => {
    const results = graphDslToDefinitions(nginxTopology);
    const nginxEs = results.find((r) => r.name === 'nginx_es')!;
    expect(nginxEs.request.stream.ingest.lifecycle).toEqual({ dsl: { data_retention: '30d' } });

    // nodes without explicit lifecycle get the default (inherit)
    const webserverEs = results.find((r) => r.name === 'webserver_es')!;
    expect(webserverEs.request.stream.ingest.lifecycle).toEqual({ inherit: {} });
  });
});

describe('graphDslNodeIds', () => {
  it('returns all node ids in sources → pipelines → destinations order', () => {
    const ids = graphDslNodeIds(nginxTopology);
    expect(ids).toEqual(['otlp_in', 'serviceA_parse', 'nginx_es', 'webserver_es', 'serviceA_es']);
  });
});
