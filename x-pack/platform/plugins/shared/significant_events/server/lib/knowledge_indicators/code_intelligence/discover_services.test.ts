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
  values: paths.map((path) => [path]),
});

const linesResponse = (lines: Array<[string, number, string]>) => ({
  columns: [
    { name: 'file.path', type: 'keyword' },
    { name: 'line.number', type: 'long' },
    { name: 'line.content', type: 'keyword' },
  ],
  values: lines,
});

const repo: IndexedRepoRef = {
  repository: 'open-telemetry/opentelemetry-demo',
  org: 'open-telemetry',
  repo: 'opentelemetry-demo',
  gitSha: 'abc123',
  ref: 'main',
};

describe('listIndexedRepos', () => {
  it('maps refs-index rows to IndexedRepoRef[]', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(
      refsResponse([['open-telemetry', 'opentelemetry-demo', 'abc123', 'main']])
    );

    const repos = await listIndexedRepos({ esClient, logger: loggerMock.create() });
    expect(repos).toEqual([repo]);
  });

  it('never throws — returns [] on query failure', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockRejectedValue(new Error('no index'));
    await expect(listIndexedRepos({ esClient, logger: loggerMock.create() })).resolves.toEqual([]);
  });
});

describe('discoverCandidateRoots', () => {
  it('derives candidate roots + marker-implied language from marker file paths', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      if (query.includes('line.content RLIKE')) return linesResponse([]);
      const pattern = params?.find((param) => 'pattern' in param)?.pattern;
      if (pattern === '.*go[.]mod') return pathsResponse(['src/checkout/go.mod']);
      if (pattern === '.*Dockerfile([.][A-Za-z0-9_-]+)?') {
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
        hasEntrypoint: false,
      },
    ]);
  });

  it('rejects paths whose basename does not actually match the marker', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      if (query.includes('line.content RLIKE')) return linesResponse([]);
      const pattern = params?.find((param) => 'pattern' in param)?.pattern;
      if (pattern === '.*go[.]mod') return pathsResponse(['src/foo/cargo.model.ts']);
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
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      if (query.includes('line.content RLIKE')) return linesResponse([]);
      const pattern = params?.find((param) => 'pattern' in param)?.pattern as string | undefined;
      if (pattern === '.*Dockerfile([.][A-Za-z0-9_-]+)?') {
        return pathsResponse(['src/ad/Dockerfile']);
      }
      if (pattern?.includes('compose')) return pathsResponse(['compose.yaml']);
      if (pattern === '.*[.]tf') return pathsResponse(['infra/main.tf']);
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

  it('supports Dockerfile suffixes and build.gradle.kts but rejects lookalikes', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      if (query.includes('line.content RLIKE')) return linesResponse([]);
      const pattern = params?.find((param) => 'pattern' in param)?.pattern;
      if (pattern === '.*Dockerfile([.][A-Za-z0-9_-]+)?') {
        return pathsResponse(['src/foo/Dockerfile.prod', 'docs/Dockerfile-notes.md']);
      }
      if (pattern === '.*build[.]gradle[.]kts') {
        return pathsResponse(['services/api/build.gradle.kts']);
      }
      return pathsResponse([]);
    });

    const { candidates } = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(candidates).toEqual([
      expect.objectContaining({ serviceRoot: 'services/api', language: 'Java' }),
      expect.objectContaining({ serviceRoot: 'src/foo', markers: ['Dockerfile'] }),
    ]);
    expect(candidates.some(({ serviceRoot }) => serviceRoot === 'docs')).toBe(false);
  });

  it('collects bounded manifest, declared-name, and entrypoint evidence', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const manifestContentPatterns = new Set([
      '.*image:.*',
      '.*container_name:.*',
      '.*kind: ?(Deployment|StatefulSet|DaemonSet|CronJob).*',
      '.*app[.]kubernetes[.]io/name.*',
    ]);
    let manifestContentCalls = 0;
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      const pattern = params?.find((param) => 'pattern' in param)?.pattern as string | undefined;
      if (!query.includes('line.content RLIKE')) {
        if (pattern === '.*Dockerfile([.][A-Za-z0-9_-]+)?') {
          return pathsResponse(['src/checkout/Dockerfile', 'src/library/Dockerfile']);
        }
        if (pattern?.includes('compose')) return pathsResponse(['deploy/compose.yaml']);
        return pathsResponse([]);
      }
      if (pattern && manifestContentPatterns.has(pattern)) {
        manifestContentCalls += 1;
        return pattern === '.*image:.*'
          ? linesResponse(
              Array.from({ length: 101 }, (_, index) => [
                'deploy/compose.yaml',
                index + 1,
                `  image: service-${index}`,
              ])
            )
          : linesResponse([]);
      }
      if (pattern === '.*OTEL_SERVICE_NAME.*') {
        return linesResponse([['src/checkout/.env', 1, 'OTEL_SERVICE_NAME=checkout']]);
      }
      if (pattern === '.*func main[(].*') {
        return linesResponse([['src/checkout/main.go', 10, 'func main() {']]);
      }
      return linesResponse([]);
    });

    const result = await discoverCandidateRoots({ esClient, repo, logger: loggerMock.create() });

    expect(manifestContentCalls).toBe(4);
    expect(result.manifestLines).toHaveLength(100);
    expect(result.manifestLines[0]).toContain('image: service-0');
    expect(result.serviceNameLines).toContain('src/checkout/.env:1\tOTEL_SERVICE_NAME=checkout');
    expect(result.candidates).toEqual([
      expect.objectContaining({ serviceRoot: 'src/checkout', hasEntrypoint: true }),
      expect.objectContaining({ serviceRoot: 'src/library', hasEntrypoint: false }),
    ]);
  });

  it('marks a repo-root candidate only when the repo has an entrypoint hit', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    let hasEntrypointHit = false;
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      const pattern = params?.find((param) => 'pattern' in param)?.pattern;
      if (!query.includes('line.content RLIKE')) {
        return pattern === '.*go[.]mod' ? pathsResponse(['go.mod']) : pathsResponse([]);
      }
      if (hasEntrypointHit && pattern === '.*func main[(].*') {
        return linesResponse([['main.go', 1, 'func main() {']]);
      }
      return linesResponse([]);
    });

    const withoutHit = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(withoutHit.candidates[0].hasEntrypoint).toBe(false);

    hasEntrypointHit = true;
    const withHit = await discoverCandidateRoots({
      esClient,
      repo,
      logger: loggerMock.create(),
    });
    expect(withHit.candidates[0].hasEntrypoint).toBe(true);
  });

  it('warns on bounded marker/manifest path truncation, but not IaC limit 1', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    esClient.esql.query.mockImplementation(async (args: unknown) => {
      const { query, params } = args as {
        query: string;
        params?: Array<Record<string, unknown>>;
      };
      if (query.includes('line.content RLIKE')) return linesResponse([]);
      const pattern = params?.find((param) => 'pattern' in param)?.pattern as string | undefined;
      if (pattern === '.*go[.]mod') return pathsResponse(['a/go.mod']);
      if (pattern === '.*docker-compose.*[.]ya?ml') return pathsResponse(['compose.yaml']);
      if (pattern === '.*[.]tf') return pathsResponse(['infra/main.tf']);
      return pathsResponse([]);
    });

    await discoverCandidateRoots({ esClient, repo, logger, perMarkerLimit: 1 });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('.*go[.]mod'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('limit 1'));
    expect(logger.warn.mock.calls.some(([message]) => String(message).includes('.*[.]tf'))).toBe(
      false
    );
  });
});
