/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getConnectorSpec, type ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import {
  connectorSourceRef,
  describeParams,
  describeResearchSources,
  esqlSourceRef,
  evidenceId,
  indicesOfEsqlSource,
  paramsOf,
  readOnlySubActions,
  resultsOf,
  runResearchSearches,
  type ResearchActionsClient,
} from './research';

jest.mock('@kbn/connector-specs', () => ({
  ...jest.requireActual('@kbn/connector-specs'),
  getConnectorSpec: jest.fn(),
}));

const handler = jest.fn();
const notionSpec = {
  metadata: { description: 'Search and read Notion pages.' },
  skill: 'Search by title first, then read a page by its id.',
  actions: {
    searchPages: {
      isTool: true,
      scope: 'read',
      description: 'Search pages by title',
      input: z.object({
        query: z.string().describe('The title to search for'),
        limit: z.number().optional(),
      }),
      handler,
    },
    getPage: {
      isTool: true,
      scope: 'read',
      description: 'Read a page',
      input: z.object({ pageId: z.string() }),
      handler,
    },
    createPage: {
      isTool: true,
      scope: 'write',
      description: 'Create a page',
      input: z.object({ title: z.string() }),
      handler,
    },
    archivePage: { isTool: true, scope: 'destroy', input: z.object({}), handler },
    exportAll: { isTool: false, scope: 'read', input: z.object({}), handler },
  },
} as unknown as ConnectorSpec;

const sources: AiIndexSource[] = [
  { type: 'esql', value: 'FROM support-cases, kb-* | WHERE status == "open" | LIMIT 10' },
  { type: 'connector', value: 'notion-1' },
];

const logger = loggingSystemMock.createLogger();

const createActionsClient = ({
  selectedActions,
  data,
}: { selectedActions?: string[]; data?: unknown } = {}) =>
  ({
    get: jest.fn(async ({ id }: { id: string }) => {
      if (id === 'missing') {
        throw new Error('Saved object [action/missing] not found');
      }
      return {
        id,
        name: id === 'webhook' ? 'Webhook' : 'Team Notion',
        actionTypeId: id === 'webhook' ? '.webhook' : '.notion',
        config: { selectedActions },
      };
    }),
    execute: jest.fn(async () => ({ status: 'ok', actionId: 'notion-1', data })),
  } as unknown as jest.Mocked<ResearchActionsClient>);

const createEsClient = (search: jest.Mock) => ({ search } as unknown as ElasticsearchClient);

beforeEach(() => {
  jest
    .mocked(getConnectorSpec)
    .mockImplementation((type) => (type === '.notion' ? notionSpec : undefined));
});

describe('indicesOfEsqlSource', () => {
  it('reads the indices of the FROM clause', () => {
    expect(indicesOfEsqlSource(sources[0].value)).toEqual(['support-cases', 'kb-*']);
    expect(indicesOfEsqlSource('ROW a = 1')).toEqual([]);
  });
});

describe('describeParams', () => {
  it('lists each parameter with its type, whether it is required, and its description', () => {
    expect(
      describeParams(
        z.object({
          query: z.string().describe('The title'),
          limit: z.number().optional(),
          mode: z.enum(['fast', 'full']).default('fast'),
        })
      )
    ).toBe(
      '- query (string, required): The title\n- limit (number, optional)\n- mode ("fast" | "full", optional)'
    );
    expect(describeParams(undefined)).toBe('No parameters');
    expect(describeParams(z.object({}))).toBe('No parameters');
  });
});

describe('readOnlySubActions', () => {
  it('offers only tools that read and are enabled on the connector', () => {
    expect(readOnlySubActions(notionSpec, undefined).map(({ name }) => name)).toEqual([
      'searchPages',
      'getPage',
    ]);
    expect(
      readOnlySubActions(notionSpec, ['getPage', 'createPage']).map(({ name }) => name)
    ).toEqual(['getPage']);
  });
});

describe('describeResearchSources', () => {
  it('describes an ES|QL source by its indices and a connector by its read-only sub-actions', async () => {
    const described = await describeResearchSources({
      sources,
      actionsClient: createActionsClient(),
    });

    expect(described).toEqual([
      {
        ref: esqlSourceRef(sources[0].value),
        type: 'esql',
        name: sources[0].value,
        description: 'Full-text search over support-cases, kb-*',
        indices: ['support-cases', 'kb-*'],
      },
      {
        ref: 'connector:notion-1',
        type: 'connector',
        name: 'Team Notion',
        description: 'Search and read Notion pages.',
        sub_actions: [
          {
            name: 'searchPages',
            description: 'Search pages by title',
            params:
              '- query (string, required): The title to search for\n- limit (number, optional)',
          },
          { name: 'getPage', description: 'Read a page', params: '- pageId (string, required)' },
        ],
        guidance: 'Search by title first, then read a page by its id.',
      },
    ]);
  });

  it('says why a source cannot be searched, and describes each source once', async () => {
    const described = await describeResearchSources({
      sources: [
        { type: 'esql', value: 'ROW a = 1' },
        { type: 'connector', value: 'webhook' },
        { type: 'connector', value: 'missing' },
        { type: 'connector', value: 'notion-1' },
        { type: 'connector', value: 'notion-1' },
      ],
      actionsClient: createActionsClient({ selectedActions: ['createPage'] }),
    });

    expect(described.map(({ ref, error }) => ({ ref, error }))).toEqual([
      { ref: esqlSourceRef('ROW a = 1'), error: 'The ES|QL source has no FROM clause to search.' },
      {
        ref: 'connector:webhook',
        error: "Connector type '.webhook' has no sub-actions research can run.",
      },
      {
        ref: 'connector:missing',
        error: 'The connector cannot be read: Saved object [action/missing] not found',
      },
      { ref: 'connector:notion-1', error: 'The connector has no read-only sub-actions enabled.' },
    ]);
  });
});

describe('resultsOf', () => {
  it('finds the results of a connector response', () => {
    expect(resultsOf([{ a: 1 }, { a: 2 }])).toEqual([{ a: 1 }, { a: 2 }]);
    expect(resultsOf({ total: 2, results: [{ a: 1 }, { a: 2 }] })).toEqual([{ a: 1 }, { a: 2 }]);
    expect(resultsOf({ hits: { total: 1, hits: [{ a: 1 }] } })).toEqual([{ a: 1 }]);
    expect(resultsOf({ id: 'p1', title: 'One page' })).toEqual([{ id: 'p1', title: 'One page' }]);
    expect(resultsOf('plain text')).toEqual(['plain text']);
    expect(resultsOf(undefined)).toEqual([]);
  });
});

describe('paramsOf', () => {
  it('takes an object or a JSON object string', () => {
    expect(paramsOf({ query: 'acme' })).toEqual({ query: 'acme' });
    expect(paramsOf('{"query":"acme"}')).toEqual({ query: 'acme' });
    expect(paramsOf(undefined)).toEqual({});
    expect(paramsOf('  ')).toEqual({});
    expect(() => paramsOf('{query')).toThrow('params is not valid JSON.');
    expect(() => paramsOf('[1]')).toThrow('params must be a JSON object.');
  });
});

describe('runResearchSearches', () => {
  const esqlRef = esqlSourceRef(sources[0].value);
  const hit = (index: string, id: string, source: Record<string, unknown>) => ({
    _index: index,
    _id: id,
    _source: source,
  });

  it('searches the indices of an ES|QL source full-text, as the workflow user', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: { hits: [hit('support-cases', 'case/1', { title: 'Acme outage', status: 'open' })] },
    });

    const { evidence, errors } = await runResearchSearches({
      sources,
      searches: [{ source: esqlRef, query: 'acme outage' }],
      esClient: createEsClient(search),
      actionsClient: createActionsClient(),
      resultsPerSearch: 4,
      logger,
    });

    expect(errors).toEqual([]);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'support-cases,kb-*',
        size: 4,
        ignore_unavailable: true,
        query: { multi_match: { query: 'acme outage', lenient: true } },
      }),
      { signal: undefined }
    );
    expect(evidence).toEqual([
      {
        id: evidenceId('index://support-cases/case%2F1'),
        source: esqlRef,
        uri: 'index://support-cases/case%2F1',
        title: 'Acme outage',
        text: '{"title":"Acme outage","status":"open"}',
      },
    ]);
  });

  it('falls back to a simple query string search when the full-text search is rejected', async () => {
    const search = jest
      .fn()
      .mockRejectedValueOnce(new Error('failed to create query'))
      .mockResolvedValue({ hits: { hits: [hit('kb-1', '2', { name: 'Runbook' })] } });

    const { evidence } = await runResearchSearches({
      sources,
      searches: [{ source: esqlRef, query: 'runbook' }],
      esClient: createEsClient(search),
      actionsClient: createActionsClient(),
      logger,
    });

    expect(search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: { simple_query_string: { query: 'runbook', lenient: true } },
      }),
      { signal: undefined }
    );
    expect(evidence.map(({ title }) => title)).toEqual(['Runbook']);
  });

  it('runs a read-only sub-action of a connector source and splits its results', async () => {
    const actionsClient = createActionsClient({
      data: {
        results: [
          { id: 'p1', title: 'Acme plan', url: 'https://notion.so/p1' },
          { id: 'p2', title: 'Acme notes' },
        ],
      },
    });

    const { evidence, errors } = await runResearchSearches({
      sources,
      searches: [
        { source: 'connector:notion-1', sub_action: 'searchPages', params: '{"query":"Acme"}' },
      ],
      esClient: createEsClient(jest.fn()),
      actionsClient,
      logger,
    });

    expect(errors).toEqual([]);
    expect(actionsClient.execute).toHaveBeenCalledWith({
      actionId: 'notion-1',
      params: { subAction: 'searchPages', subActionParams: { query: 'Acme' } },
      signal: undefined,
    });
    expect(evidence).toHaveLength(2);
    expect(evidence[0]).toEqual(
      expect.objectContaining({
        source: 'connector:notion-1',
        uri: 'https://notion.so/p1',
        title: 'Acme plan',
      })
    );
    expect(evidence[1].uri).toMatch(/^connector:\/\/notion-1\/searchPages\/[0-9a-f]{8}$/);
  });

  it('never runs a sub-action that writes, nor a source the AI index does not have', async () => {
    const actionsClient = createActionsClient();
    const search = jest.fn();

    const { evidence, errors } = await runResearchSearches({
      sources,
      searches: [
        { source: 'connector:notion-1', sub_action: 'createPage', params: { title: 'x' } },
        { source: 'connector:other', sub_action: 'searchPages' },
        { source: 'esql:unknown', query: 'x' },
        { source: 'somewhere', query: 'x' },
        { source: esqlRef },
        { source: 'connector:notion-1' },
      ],
      esClient: createEsClient(search),
      actionsClient,
      logger,
    });

    expect(evidence).toEqual([]);
    expect(actionsClient.execute).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
    expect(errors).toEqual([
      {
        source: 'connector:notion-1',
        message:
          "Sub-action 'createPage' is not one of the read-only sub-actions of this connector: searchPages, getPage.",
      },
      { source: 'connector:other', message: 'There is no such source.' },
      { source: 'esql:unknown', message: 'There is no such source.' },
      { source: 'somewhere', message: 'There is no such source.' },
      { source: esqlRef, message: 'A search of an ES|QL source needs a query.' },
      {
        source: 'connector:notion-1',
        message: 'A search of a connector source needs a sub_action.',
      },
    ]);
  });

  it('reports a failed sub-action and keeps running the other searches', async () => {
    const actionsClient = createActionsClient();
    actionsClient.execute.mockResolvedValueOnce({
      status: 'error',
      actionId: 'notion-1',
      message: 'Rate limited',
    });
    const search = jest
      .fn()
      .mockResolvedValue({ hits: { hits: [hit('support-cases', '1', { title: 'A' })] } });

    const { evidence, errors } = await runResearchSearches({
      sources,
      searches: [
        { source: 'connector:notion-1', sub_action: 'getPage', params: { pageId: 'p1' } },
        { source: esqlRef, query: 'a' },
      ],
      esClient: createEsClient(search),
      actionsClient,
      logger,
    });

    expect(errors).toEqual([{ source: 'connector:notion-1', message: 'Rate limited' }]);
    expect(evidence).toHaveLength(1);
  });

  it('leaves out evidence already found, in this round or listed to skip', async () => {
    const known = 'index://support-cases/1';
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          hit('support-cases', '1', { title: 'known' }),
          hit('support-cases', '2', { title: 'new' }),
        ],
      },
    });

    const { evidence } = await runResearchSearches({
      sources,
      searches: [
        { source: esqlRef, query: 'a' },
        { source: esqlRef, query: 'b' },
      ],
      esClient: createEsClient(search),
      actionsClient: createActionsClient(),
      skip: [evidenceId(known)],
      logger,
    });

    expect(evidence.map(({ title }) => title)).toEqual(['new']);
  });

  it('shortens long results', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: { hits: [hit('support-cases', '1', { body: 'x'.repeat(5000) })] },
    });

    const { evidence } = await runResearchSearches({
      sources,
      searches: [{ source: esqlRef, query: 'a' }],
      esClient: createEsClient(search),
      actionsClient: createActionsClient(),
      logger,
    });

    expect(evidence[0].text).toHaveLength(1500);
    expect(evidence[0].text.endsWith('…')).toBe(true);
  });

  it('stops when the run is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runResearchSearches({
        sources,
        searches: [{ source: esqlRef, query: 'a' }],
        esClient: createEsClient(jest.fn()),
        actionsClient: createActionsClient(),
        logger,
        abortSignal: controller.signal,
      })
    ).rejects.toThrow();
  });

  it('names sources by stable refs', () => {
    expect(esqlRef).toMatch(/^esql:[0-9a-f]{8}$/);
    expect(esqlSourceRef(sources[0].value)).toBe(esqlRef);
    expect(connectorSourceRef('notion-1')).toBe('connector:notion-1');
  });
});
