/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { discoverCandidateRoots, listIndexedRepos } from './discover_services';
import type { IndexedRepoRef } from './types';

const refsResponse = (rows: Array<[string, string, string, string]>) => ({
  columns: [
    { name: 'git.org', type: 'keyword' },
    { name: 'git.repo', type: 'keyword' },
    { name: 'git.commit', type: 'keyword' },
    { name: 'git.ref', type: 'keyword' },
  ],
  values: rows,
});

const pathsResponse = (paths: string[]) => ({
  columns: [{ name: 'file.path', type: 'keyword' }],
  values: paths.map((p) => [p]),
});

describe('listIndexedRepos', () => {
  it('maps refs-index rows to IndexedRepoRef[]', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(
      refsResponse([['open-telemetry', 'opentelemetry-demo', 'abc123', 'main']])
    );

    const repos = await listIndexedRepos({ esClient, logger: loggerMock.create() });
    expect(repos).toEqual([
      {
        repository: 'open-telemetry/opentelemetry-demo',
        org: 'open-telemetry',
        repo: 'opentelemetry-demo',
        gitSha: 'abc123',
        ref: 'main',
      },
    ]);
  });

  it('never throws — returns [] on query failure', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockRejectedValue(new Error('no index'));
    await expect(listIndexedRepos({ esClient, logger: loggerMock.create() })).resolves.toEqual([]);
  });
});

describe('discoverCandidateRoots', () => {
  const repo: IndexedRepoRef = {
    repository: 'open-telemetry/opentelemetry-demo',
    org: 'open-telemetry',
    repo: 'opentelemetry-demo',
    gitSha: 'abc123',
    ref: 'main',
  };

  it('derives candidate roots + marker-implied language from marker file paths', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    // Return marker hits for go.mod (checkout) and Dockerfile (checkout); empty otherwise.
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { params } = args as { params?: Array<Record<string, unknown>> };
      const pattern = params?.find((p) => 'pattern' in p)?.pattern as string | undefined;
      if (pattern === '.*go[.]mod') {
        return pathsResponse(['src/checkout/go.mod']);
      }
      if (pattern === '.*Dockerfile') {
        return pathsResponse(['src/checkout/Dockerfile']);
      }
      return pathsResponse([]);
    });

    const { candidates } = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(candidates).toEqual([
      {
        repository: 'open-telemetry/opentelemetry-demo',
        gitSha: 'abc123',
        serviceRoot: 'src/checkout',
        markers: ['Dockerfile', 'go.mod'],
        language: 'Go',
      },
    ]);
  });

  it('rejects paths whose basename does not actually match the marker', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { params } = args as { params?: Array<Record<string, unknown>> };
      const pattern = params?.find((p) => 'pattern' in p)?.pattern as string | undefined;
      // `.*go[.]mod` could match `src/foo/cargo.model.ts` — must be rejected.
      if (pattern === '.*go[.]mod') {
        return pathsResponse(['src/foo/cargo.model.ts']);
      }
      return pathsResponse([]);
    });

    const { candidates } = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(candidates).toEqual([]);
  });

  it('collects manifest paths and IaC signals', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { params } = args as { params?: Array<Record<string, unknown>> };
      const pattern = params?.find((p) => 'pattern' in p)?.pattern as string | undefined;
      if (pattern === '.*Dockerfile') {
        return pathsResponse(['src/ad/Dockerfile']);
      }
      if (pattern?.includes('compose')) {
        return pathsResponse(['compose.yaml']);
      }
      if (pattern === '.*[.]tf') {
        return pathsResponse(['infra/main.tf']);
      }
      return pathsResponse([]);
    });

    const { manifestPaths, iacSignals } = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(manifestPaths).toContain('compose.yaml');
    expect(iacSignals).toContainEqual({ kind: 'terraform', path: 'infra/main.tf' });
    expect(iacSignals).toContainEqual({ kind: 'compose', path: 'compose.yaml' });
  });

  it('marks language unknown for a Dockerfile-only root', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { params } = args as { params?: Array<Record<string, unknown>> };
      const pattern = params?.find((p) => 'pattern' in p)?.pattern as string | undefined;
      if (pattern === '.*Dockerfile') {
        return pathsResponse(['src/kafka/Dockerfile']);
      }
      return pathsResponse([]);
    });

    const { candidates } = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(candidates).toEqual([
      {
        repository: 'open-telemetry/opentelemetry-demo',
        gitSha: 'abc123',
        serviceRoot: 'src/kafka',
        markers: ['Dockerfile'],
        language: 'unknown',
      },
    ]);
  });
});
