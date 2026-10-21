/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolResultType } from '@kbn/agent-builder-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { generateEsqlTool } from './generate_esql';
import { resolveToolSchema } from './test_utils';

jest.mock('@kbn/agent-builder-genai-utils', () => {
  const actual = jest.requireActual('@kbn/agent-builder-genai-utils');
  return {
    ...actual,
    generateEsql: jest.fn(),
    setDefaultEsqlCacheKey: jest.fn(),
  };
});

import { generateEsql } from '@kbn/agent-builder-genai-utils';

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;

const createHandlerContext = () =>
  ({
    esClient: { asCurrentUser: {} },
    attachments: { getActive: () => [] } as unknown as AttachmentStateManager,
    modelProvider: {},
    logger: { debug: jest.fn() },
    events: {},
  } as any);

const run = async ({
  includeFrozen,
  includeFrozenByDefault = false,
}: { includeFrozen?: boolean; includeFrozenByDefault?: boolean } = {}) => {
  const tool = generateEsqlTool();
  const schema = await resolveToolSchema(tool, includeFrozenByDefault);
  const result = (await tool.handler(
    schema.parse({ query: 'total sales', include_frozen: includeFrozen }),
    createHandlerContext()
  )) as ToolHandlerStandardReturn;
  return result.results;
};

const typesOf = (results: ToolHandlerStandardReturn['results']) => results.map(({ type }) => type);

describe('generateEsqlTool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has the platform generate_esql tool id', () => {
    expect(generateEsqlTool().id).toBe(platformCoreTools.generateEsql);
  });

  it('returns the query and the answer on success', async () => {
    generateEsqlMock.mockResolvedValue({
      query: 'FROM sales | STATS SUM(amount)',
      answer: 'Here is the query.',
    });

    const results = await run();

    expect(typesOf(results)).toEqual([ToolResultType.query, ToolResultType.other]);
    expect(results[0].data).toEqual({ esql: 'FROM sales | STATS SUM(amount)' });
    expect(results[1].data).toEqual({ answer: 'Here is the query.' });
  });

  // `error` alone can be as unhelpful as "No query was generated"; the caller needs the model's
  // explanation to tell an impossible request from a transient failure.
  it('returns the answer alongside the error when generation fails', async () => {
    generateEsqlMock.mockResolvedValue({
      error: 'No query was generated',
      answer: '`sales` has no category field, so this needs data from another index.',
    });

    const results = await run();

    expect(typesOf(results)).toEqual([ToolResultType.error, ToolResultType.other]);
    expect(results[0].data).toEqual({ message: 'No query was generated' });
    expect(results[1].data).toEqual({
      answer: '`sales` has no category field, so this needs data from another index.',
    });
  });

  it('passes a validation failure through verbatim rather than a generic message', async () => {
    const error =
      'position 12-18: "stores" is not a valid JOIN index. Please use a "lookup" mode index.';
    generateEsqlMock.mockResolvedValue({ error, answer: 'I tried to join to `stores`.' });

    const results = await run();

    expect(results[0].data).toEqual({ message: error });
  });

  // The caller is told not to invent or repair queries, so a query that failed validation or
  // execution must not be handed back as if it were usable.
  it('withholds the failed query', async () => {
    generateEsqlMock.mockResolvedValue({
      error: 'position 3-9: Unknown column [nope]',
      query: 'FROM sales | KEEP nope',
      answer: 'attempted',
    });

    const results = await run();

    expect(typesOf(results)).not.toContain(ToolResultType.query);
  });

  it('returns only the error when the model produced no answer either', async () => {
    generateEsqlMock.mockResolvedValue({ error: 'No query was generated' });

    const results = await run();

    expect(typesOf(results)).toEqual([ToolResultType.error]);
  });

  describe('include_frozen', () => {
    beforeEach(() => {
      generateEsqlMock.mockResolvedValue({ query: 'FROM sales', answer: 'ok' });
    });

    it('excludes frozen tier indices by default', async () => {
      await run();

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: false })
      );
    });

    it('includes frozen tier indices when opted in', async () => {
      await run({ includeFrozen: true });

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });

    it('includes frozen tier indices by default when the space setting is enabled', async () => {
      await run({ includeFrozenByDefault: true });

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });

    it('lets the agent override the default', async () => {
      await run({ includeFrozen: false, includeFrozenByDefault: true });

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: false })
      );
    });
  });
});
