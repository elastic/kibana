/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { discoverLoggingWrappers } from './discover_logging_wrappers';

const COLUMNS = [
  { name: 'git.org', type: 'keyword' },
  { name: 'git.repo', type: 'keyword' },
  { name: 'git.commit', type: 'keyword' },
  { name: 'file.path', type: 'keyword' },
  { name: 'line.number', type: 'long' },
  { name: 'line.content', type: 'keyword' },
];

const row = (path: string, line: number, content: string) => [
  'openai',
  'demo',
  'abc123',
  path,
  line,
  content,
];

const regexParamOf = (req: { params: Array<Record<string, unknown>> }): string | undefined =>
  req.params.find((p) => 'regex' in p)?.regex as string | undefined;

const filePathParamOf = (req: { params: Array<Record<string, unknown>> }): string | undefined =>
  req.params.find((p) => 'file_path' in p)?.file_path as string | undefined;

const baseOptions = {
  gitOrg: 'openai',
  gitRepo: 'demo',
  gitCommit: 'abc123',
  filePath: '**',
  perPatternLimit: 500,
};

describe('discoverLoggingWrappers', () => {
  it('(a) recovers a 2-hop Elixir wrapper: log_error -> log -> Logger.error', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    esClient.esql.query.mockImplementation((async (req: {
      query: string;
      params: Array<Record<string, unknown>>;
    }) => {
      const regex = regexParamOf(req);
      if (regex === '.*defp?[ ].*') {
        return {
          columns: COLUMNS,
          values: [
            row('lib/logging.ex', 21, 'def log_error(socket, code, msg) do'),
            row('lib/logging.ex', 30, 'defp log(socket, level, code, msg) do'),
          ],
        };
      }
      if (regex === '.*(log)[(].*') {
        return {
          columns: COLUMNS,
          values: [row('lib/logging.ex', 23, 'log(socket, :error, code, msg)')],
        };
      }
      // round2->round3 alternation of both names: no further calls.
      return { columns: COLUMNS, values: [] };
    }) as unknown as typeof esClient.esql.query);

    const names = await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'Elixir',
      logger,
      idiomHitLocations: ['lib/logging.ex:31'],
    });

    expect(names).toEqual(expect.arrayContaining(['log_error', 'log']));
    expect(esClient.esql.query).toHaveBeenCalledTimes(3);
  });

  it('(b) recovers a 2-hop C wrapper: serverLog -> serverLogRaw -> fprintf(stderr', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: {
      query: string;
      params: Array<Record<string, unknown>>;
    }) => {
      const regex = regexParamOf(req);
      if (regex?.endsWith('[{]')) {
        return {
          columns: COLUMNS,
          values: [
            row('src/log.c', 10, 'void serverLogRaw(int level, const char *msg) {'),
            row('src/log.c', 20, 'void serverLog(int level, const char *fmt, ...) {'),
          ],
        };
      }
      if (regex === '.*(serverLogRaw)[(].*') {
        return { columns: COLUMNS, values: [row('src/log.c', 21, 'serverLogRaw(level, buf);')] };
      }
      return { columns: COLUMNS, values: [] };
    }) as unknown as typeof esClient.esql.query);

    const names = await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'C',
      logger: loggerMock.create(),
      idiomHitLocations: ['src/log.c:11'],
    });

    expect(names).toEqual(expect.arrayContaining(['serverLogRaw', 'serverLog']));
  });

  it('(c) stops expanding at maxRounds, missing a 4th wrapping hop', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: {
      query: string;
      params: Array<Record<string, unknown>>;
    }) => {
      const regex = regexParamOf(req);
      if (regex === '.*func .*[(].*') {
        return {
          columns: COLUMNS,
          values: [
            row('pkg/log.go', 5, 'func wrap0(msg string) {'),
            row('pkg/log.go', 10, 'func wrap1(msg string) {'),
            row('pkg/log.go', 15, 'func wrap2(msg string) {'),
            row('pkg/log.go', 20, 'func wrap3(msg string) {'),
          ],
        };
      }
      if (regex === '.*(wrap0)[(].*') {
        return { columns: COLUMNS, values: [row('pkg/log.go', 11, 'wrap0(msg)')] };
      }
      if (regex === '.*(wrap0|wrap1)[(].*') {
        return { columns: COLUMNS, values: [row('pkg/log.go', 16, 'wrap1(msg)')] };
      }
      // A wrap0|wrap1|wrap2 grep (round3->4) would recover wrap2(msg) inside
      // wrap3, but that grep must never be issued once maxRounds is reached.
      return { columns: COLUMNS, values: [row('pkg/log.go', 21, 'wrap2(msg)')] };
    }) as unknown as typeof esClient.esql.query);

    const names = await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'Go',
      logger: loggerMock.create(),
      idiomHitLocations: ['pkg/log.go:6'],
    });

    expect(names).toEqual(expect.arrayContaining(['wrap0', 'wrap1', 'wrap2']));
    expect(names).not.toContain('wrap3');
    expect(esClient.esql.query).toHaveBeenCalledTimes(3);
  });

  it('(d) caps seed files at maxSeedFiles, preferring the highest idiom-hit counts', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: COLUMNS, values: [] });

    const idiomHitLocations = [
      ...Array.from({ length: 6 }, (_, i) => `f1.go:${i + 1}`),
      ...Array.from({ length: 5 }, (_, i) => `f2.go:${i + 1}`),
      ...Array.from({ length: 4 }, (_, i) => `f3.go:${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `f4.go:${i + 1}`),
      ...Array.from({ length: 2 }, (_, i) => `f5.go:${i + 1}`),
      'f6.go:1',
    ];

    await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'Go',
      logger: loggerMock.create(),
      idiomHitLocations,
    });

    const scopedFiles = new Set(
      esClient.esql.query.mock.calls.map(([req]) => filePathParamOf(req as never))
    );
    expect(scopedFiles).toEqual(new Set(['f1.go', 'f2.go', 'f3.go', 'f4.go', 'f5.go']));
    expect(scopedFiles.has('f6.go')).toBe(false);
  });

  it('(d) caps returned wrapper names at maxWrapperNames', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const definitionRows = Array.from({ length: 15 }, (_, i) =>
      row('src/many.go', i * 10 + 1, `func wrap${i}(msg string) {`)
    );
    const idiomHitLocations = Array.from({ length: 15 }, (_, i) => `src/many.go:${i * 10 + 2}`);

    esClient.esql.query.mockImplementation((async (req: {
      query: string;
      params: Array<Record<string, unknown>>;
    }) => {
      const regex = regexParamOf(req);
      if (regex === '.*func .*[(].*') {
        return { columns: COLUMNS, values: definitionRows };
      }
      return { columns: COLUMNS, values: [] };
    }) as unknown as typeof esClient.esql.query);

    const names = await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'Go',
      logger: loggerMock.create(),
      idiomHitLocations,
    });

    expect(names).toHaveLength(12);
  });

  it('(d) skips names shorter than minWrapperNameLength and bare language keywords', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async (req: {
      query: string;
      params: Array<Record<string, unknown>>;
    }) => {
      const regex = regexParamOf(req);
      if (regex === '.*func .*[(].*') {
        return {
          columns: COLUMNS,
          values: [
            row('src/main.go', 1, 'func if(msg string) {'),
            row('src/main.go', 10, 'func ab(msg string) {'),
            row('src/main.go', 20, 'func logHelper(msg string) {'),
          ],
        };
      }
      return { columns: COLUMNS, values: [] };
    }) as unknown as typeof esClient.esql.query);

    const names = await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'Go',
      logger: loggerMock.create(),
      idiomHitLocations: ['src/main.go:2', 'src/main.go:11', 'src/main.go:21'],
    });

    expect(names).toEqual(['logHelper']);
  });

  it('(e) never throws: resolves with no names when every grep rejects', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockRejectedValue(new Error('es unavailable'));

    await expect(
      discoverLoggingWrappers({
        ...baseOptions,
        esClient,
        language: 'Go',
        logger: loggerMock.create(),
        idiomHitLocations: ['src/main.go:2'],
      })
    ).resolves.toEqual([]);
  });

  it('returns [] immediately when there are no idiom hits (no greps issued)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: COLUMNS, values: [] });

    const names = await discoverLoggingWrappers({
      ...baseOptions,
      esClient,
      language: 'Go',
      logger: loggerMock.create(),
      idiomHitLocations: [],
    });

    expect(names).toEqual([]);
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });
});
