/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { metricExamples } from '@kbn/isomer';
import type { MaterializedChartNode, MaterializedNode, UnsupportedNode } from './nodes';
import type { PipelineDeps } from './pipeline';
import { runPipeline } from './pipeline';
import type { MaterializeContext } from '../../common';
import type { DataRequest, MaterializeKit, Materializer } from './types';

interface ChartConfig {
  title: string;
  requests: DataRequest[];
}

const table = (id: string): Datatable => ({
  type: 'datatable',
  columns: [{ id, name: id, meta: { type: 'number' } }],
  rows: [{ [id]: 1 }],
});

const filter = (value: string): Filter => ({
  meta: {},
  query: { match_phrase: { 'host.name': value } },
});

const [{ node: metricNode }] = metricExamples;

const chart = (overrides: Partial<Materializer<ChartConfig>> = {}): Materializer<ChartConfig> => ({
  version: 3,
  parse: (config) => config as ChartConfig,
  describe: ({ title }) => ({
    title,
    link: { href: '/app/lens#/edit/abc', label: 'Open in Lens' },
  }),
  plan: jest.fn(({ requests }: ChartConfig): DataRequest[] | UnsupportedNode => requests),
  map: jest.fn(
    (_config: ChartConfig, { tables }): MaterializedNode => ({
      ...metricNode,
      description: tables.map(({ columns }) => columns[0].id).join(', '),
    })
  ),
  ...overrides,
});

const createDeps = (overrides: Partial<PipelineDeps> = {}) => ({
  executeEsql: jest.fn<
    ReturnType<PipelineDeps['executeEsql']>,
    Parameters<PipelineDeps['executeEsql']>
  >(async (request) => ({ table: table(request.query), losses: [] })),
  materialize: jest.fn<
    ReturnType<PipelineDeps['materialize']>,
    Parameters<PipelineDeps['materialize']>
  >(async (input) => ({ type: 'markdown', text: input.type })),
  getTimeZone: jest.fn(async () => 'UTC'),
  createKit: jest.fn(
    async (kitContext: MaterializeContext) => ({ context: kitContext } as MaterializeKit)
  ),
  validate: jest.fn<ReturnType<PipelineDeps['validate']>, Parameters<PipelineDeps['validate']>>(
    async () => []
  ),
  kibanaVersion: '9.5.0',
  now: () => new Date('2026-11-04T06:00:00.000Z'),
  ...overrides,
});

const context = { timeRange: { from: 'now-15m', to: 'now' }, filters: [filter('web-01')] };
// `now-15m` to `now`, resolved against `now` below.
const absoluteContext = {
  ...context,
  timeRange: { from: '2026-11-04T05:45:00.000Z', to: '2026-11-04T06:00:00.000Z' },
};
const meta = { materializer: 'lens', materializerVersion: 3 };
const source = {
  host: 'kibana',
  hostVersion: '9.5.0',
  meta,
  capturedAt: '2026-11-04T06:00:00.000Z',
};

describe('runPipeline', () => {
  it('runs each request in its merged context and maps the tables in plan order', async () => {
    const materializer = chart();
    const deps = createDeps();
    const config: ChartConfig = {
      title: 'Requests',
      requests: [
        { kind: 'esql', query: 'FROM a' },
        { kind: 'esql', query: 'FROM b', context: { filters: [filter('web-02')] } },
      ],
    };

    const node = await runPipeline(
      { type: 'lens', materializer, config, context, savedObjectId: 'abc', spaceId: 'ops' },
      deps
    );

    expect(materializer.plan).toHaveBeenCalledWith(config, absoluteContext);
    expect(deps.executeEsql).toHaveBeenNthCalledWith(1, config.requests[0], absoluteContext, 0);
    expect(deps.executeEsql).toHaveBeenNthCalledWith(
      2,
      config.requests[1],
      { ...absoluteContext, filters: [filter('web-01'), filter('web-02')] },
      1
    );
    expect(materializer.map).toHaveBeenCalledWith(
      config,
      { tables: [table('FROM a'), table('FROM b')], nodes: [] },
      expect.objectContaining({ context: absoluteContext })
    );
    expect(node).toEqual({
      ...metricNode,
      description: 'FROM a, FROM b',
      source: {
        ...source,
        meta: { ...meta, spaceId: 'ops', savedObjectType: 'lens', savedObjectId: 'abc' },
        timeRange: absoluteContext.timeRange,
      },
    });
    expect(deps.validate).toHaveBeenCalledWith(node);
  });

  it("adds the executor's losses to the node's own", async () => {
    const rowCap = {
      path: 'data.rows',
      kind: 'dropped' as const,
      note: 'Kept the first 1000 rows.',
    };
    const ownLoss = { path: 'colors', kind: 'approximated' as const, note: 'Palette.' };
    const materializer = chart({
      map: (): MaterializedChartNode => ({ ...metricNode, losses: [ownLoss] }),
    });
    const deps = createDeps({
      executeEsql: jest.fn(async () => ({ table: table('x'), losses: [rowCap] })),
    });

    const node = await runPipeline(
      {
        type: 'lens',
        materializer,
        config: { title: 'Requests', requests: [{ kind: 'esql', query: 'FROM a' }] },
        context: {},
      },
      deps
    );

    expect(node).toEqual(expect.objectContaining({ losses: [ownLoss, rowCap] }));
    expect(node).not.toHaveProperty('source.timeRange');
  });

  it('materializes nested inputs in their merged context', async () => {
    const materializer = chart();
    const deps = createDeps();
    const requests: DataRequest[] = [
      { kind: 'materialize', input: { type: 'lens', id: 'p1' } },
      {
        kind: 'materialize',
        input: { type: 'markdown', config: {} },
        context: { ignoreGlobalFilters: true },
      },
    ];

    await runPipeline(
      { type: 'dashboard', materializer, config: { title: 'Logs', requests }, context },
      deps
    );

    expect(deps.materialize).toHaveBeenNthCalledWith(
      1,
      { type: 'lens', id: 'p1' },
      absoluteContext
    );
    expect(deps.materialize).toHaveBeenNthCalledWith(
      2,
      { type: 'markdown', config: {} },
      { timeRange: absoluteContext.timeRange }
    );
    expect(materializer.map).toHaveBeenCalledWith(
      expect.anything(),
      {
        tables: [],
        nodes: [
          { type: 'markdown', text: 'lens' },
          { type: 'markdown', text: 'markdown' },
        ],
      },
      expect.anything()
    );
  });

  it("returns a plan's unsupported node with the config's title and link", async () => {
    const materializer = chart({
      plan: (): UnsupportedNode => ({
        type: 'unsupported',
        title: '',
        reason: 'Region maps are not supported.',
      }),
    });
    const deps = createDeps();

    await expect(
      runPipeline(
        { type: 'lens', materializer, config: { title: 'Countries', requests: [] }, context },
        deps
      )
    ).resolves.toEqual({
      type: 'unsupported',
      title: 'Countries',
      reason: 'Region maps are not supported.',
      link: { href: '/app/lens#/edit/abc', label: 'Open in Lens' },
      source: { ...source, timeRange: absoluteContext.timeRange },
    });
    expect(deps.validate).not.toHaveBeenCalled();
  });

  it("returns a mapping's unsupported node with provenance, without validation", async () => {
    const materializer = chart({
      map: (): UnsupportedNode => ({ type: 'unsupported', title: 'Own title', reason: 'No rows.' }),
    });
    const deps = createDeps();

    await expect(
      runPipeline(
        { type: 'lens', materializer, config: { title: 'Requests', requests: [] }, context },
        deps
      )
    ).resolves.toEqual({
      type: 'unsupported',
      title: 'Own title',
      reason: 'No rows.',
      link: { href: '/app/lens#/edit/abc', label: 'Open in Lens' },
      source: { ...source, timeRange: absoluteContext.timeRange },
    });
    expect(deps.validate).not.toHaveBeenCalled();
  });

  it('returns unsupported for a request kind it has no executor for', async () => {
    const materializer = chart();
    const deps = createDeps();

    const node = await runPipeline(
      {
        type: 'lens',
        materializer,
        config: {
          title: 'Requests',
          requests: [{ kind: 'aggs', dataView: 'logs-*', aggs: [] }],
        },
        context,
      },
      deps
    );

    expect(node).toEqual(
      expect.objectContaining({
        type: 'unsupported',
        title: 'Requests',
        reason:
          'The data for this lens could not be loaded: Kibana cannot run "aggs" data requests for materialization.',
      })
    );
    expect(materializer.map).not.toHaveBeenCalled();
  });

  it('returns unsupported when a query fails', async () => {
    const deps = createDeps({
      executeEsql: jest.fn(async () => {
        throw new Error('Unknown index [logs]');
      }),
    });

    await expect(
      runPipeline(
        {
          type: 'lens',
          materializer: chart(),
          config: { title: 'Requests', requests: [{ kind: 'esql', query: 'FROM logs' }] },
          context,
        },
        deps
      )
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'unsupported',
        reason: 'The data for this lens could not be loaded: Unknown index [logs]',
      })
    );
  });

  it('returns unsupported when the node does not validate', async () => {
    const deps = createDeps({
      validate: jest.fn(async () => [
        { path: 'data.columns[0].type', message: 'must be one of: number, string, date, boolean' },
        { path: '', message: 'is over the input budget' },
      ]),
    });

    await expect(
      runPipeline(
        {
          type: 'lens',
          materializer: chart(),
          config: { title: 'Requests', requests: [] },
          context,
        },
        deps
      )
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'unsupported',
        title: 'Requests',
        reason:
          'The lens materialized into an invalid node: data.columns[0].type must be one of: number, string, date, boolean; is over the input budget',
      })
    );
  });

  it('adds no provenance to a components node', async () => {
    const materializer = chart({ map: () => ({ type: 'markdown', text: 'Hello' }) });

    await expect(
      runPipeline(
        { type: 'markdown', materializer, config: { title: 'Note', requests: [] }, context },
        createDeps()
      )
    ).resolves.toEqual({ type: 'markdown', text: 'Hello' });
  });

  it("resolves relative times in the context's time zone, then the user's", async () => {
    const materializer = chart();
    const config: ChartConfig = { title: 'Requests', requests: [] };
    const today = { timeRange: { from: 'now/d', to: 'now/d' } };

    await runPipeline(
      { type: 'lens', materializer, config, context: { ...today, timeZone: 'America/New_York' } },
      createDeps()
    );
    expect(materializer.plan).toHaveBeenLastCalledWith(config, {
      timeZone: 'America/New_York',
      timeRange: { from: '2026-11-04T05:00:00.000Z', to: '2026-11-05T04:59:59.999Z' },
    });

    await runPipeline(
      { type: 'lens', materializer, config, context: today },
      createDeps({ getTimeZone: async () => 'Asia/Tokyo' })
    );
    expect(materializer.plan).toHaveBeenLastCalledWith(config, {
      timeRange: { from: '2026-11-03T15:00:00.000Z', to: '2026-11-04T14:59:59.999Z' },
    });
  });
});
