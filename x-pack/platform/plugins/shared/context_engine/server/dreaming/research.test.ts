/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorSpec, type ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import {
  connectorSourceRef,
  describeParams,
  describeResearchSources,
  esqlSourceRef,
  indicesOfEsqlSource,
  isReadOnlyConnector,
  readOnlyConnectorIds,
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
    exportAll: { isTool: false, scope: 'write', input: z.object({}), handler },
  },
} as unknown as ConnectorSpec;

const READ_ONLY = ['searchPages', 'getPage'];

const sources: AiIndexSource[] = [
  { type: 'esql', value: 'FROM support-cases, kb-* | WHERE status == "open" | LIMIT 10' },
  { type: 'connector', value: 'notion-read' },
];

const connectors: Record<
  string,
  { name: string; actionTypeId: string; selectedActions?: string[] }
> = {
  'notion-read': { name: 'Team Notion', actionTypeId: '.notion', selectedActions: READ_ONLY },
  'notion-full': { name: 'Notion (all)', actionTypeId: '.notion' },
  'notion-none': { name: 'Notion (none)', actionTypeId: '.notion', selectedActions: [] },
  webhook: { name: 'Webhook', actionTypeId: '.webhook' },
};

const actionsClient = {
  get: jest.fn(async ({ id }: { id: string }) => {
    const connector = connectors[id];
    if (!connector) {
      throw new Error(`Saved object [action/${id}] not found`);
    }
    return {
      id,
      name: connector.name,
      actionTypeId: connector.actionTypeId,
      config: { selectedActions: connector.selectedActions },
    };
  }),
  getAll: jest.fn(async () =>
    Object.entries(connectors).map(([id, connector]) => ({
      id,
      name: connector.name,
      actionTypeId: connector.actionTypeId,
      config: { selectedActions: connector.selectedActions },
    }))
  ),
} as unknown as ResearchActionsClient;

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

describe('isReadOnlyConnector', () => {
  it('is read-only when every agent sub-action enabled on it only reads', () => {
    expect(isReadOnlyConnector(notionSpec, READ_ONLY)).toBe(true);
    expect(isReadOnlyConnector(notionSpec, ['getPage', 'exportAll'])).toBe(true);
  });

  it('is not read-only when a sub-action that writes is enabled, or all are by default', () => {
    expect(isReadOnlyConnector(notionSpec, ['getPage', 'createPage'])).toBe(false);
    expect(isReadOnlyConnector(notionSpec, ['archivePage'])).toBe(false);
    expect(isReadOnlyConnector(notionSpec, undefined)).toBe(false);
    expect(isReadOnlyConnector(notionSpec, null)).toBe(false);
  });

  it('is not read-only without a sub-action an agent can run', () => {
    expect(isReadOnlyConnector(notionSpec, [])).toBe(false);
    expect(isReadOnlyConnector(undefined, READ_ONLY)).toBe(false);
  });
});

describe('readOnlyConnectorIds', () => {
  it('lists the connectors the caller can see that are read-only', async () => {
    expect(await readOnlyConnectorIds(actionsClient)).toEqual(['notion-read']);
  });
});

describe('describeResearchSources', () => {
  it('describes an ES|QL source by its indices and a read-only connector by its sub-actions', async () => {
    const described = await describeResearchSources({ sources, actionsClient });

    expect(described).toEqual([
      {
        ref: esqlSourceRef(sources[0].value),
        type: 'esql',
        name: sources[0].value,
        description: 'Documents in support-cases, kb-*',
        indices: ['support-cases', 'kb-*'],
      },
      {
        ref: 'connector:notion-read',
        type: 'connector',
        name: 'Team Notion',
        description: 'Search and read Notion pages.',
        connector_id: 'notion-read',
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
        { type: 'connector', value: 'notion-full' },
        { type: 'connector', value: 'webhook' },
        { type: 'connector', value: 'missing' },
        { type: 'connector', value: 'notion-read' },
        { type: 'connector', value: 'notion-read' },
      ],
      actionsClient,
    });

    expect(described.map(({ ref, error }) => ({ ref, error }))).toEqual([
      { ref: esqlSourceRef('ROW a = 1'), error: 'The ES|QL source has no FROM clause to search.' },
      {
        ref: 'connector:notion-full',
        error:
          'The connector is not read-only: research only uses connectors whose enabled sub-actions all only read. Enable only its read sub-actions to use it.',
      },
      {
        ref: 'connector:webhook',
        error: "Connector type '.webhook' has no sub-actions an agent can run.",
      },
      {
        ref: 'connector:missing',
        error: 'The connector cannot be read: Saved object [action/missing] not found',
      },
      { ref: 'connector:notion-read', error: undefined },
    ]);
  });

  it('names sources by stable refs', () => {
    expect(esqlSourceRef(sources[0].value)).toMatch(/^esql:[0-9a-f]{8}$/);
    expect(esqlSourceRef(sources[0].value)).toBe(esqlSourceRef(sources[0].value));
    expect(connectorSourceRef('notion-read')).toBe('connector:notion-read');
  });
});
