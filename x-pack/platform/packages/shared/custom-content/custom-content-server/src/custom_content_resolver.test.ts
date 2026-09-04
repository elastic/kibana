/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_DEFAULT_HEIGHT,
  CUSTOM_CONTENT_MIN_HEIGHT,
  CUSTOM_CONTENT_MAX_HEIGHT,
} from '@kbn/custom-content-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createCustomContentTemplateResolver } from './custom_content_resolver';

const mockChatComplete = jest.fn();
const mockEsqlQuery = jest.fn();

const modelProvider = {
  getDefaultModel: jest.fn().mockResolvedValue({
    inferenceClient: { chatComplete: mockChatComplete },
  }),
} as unknown as ModelProvider;

const esClient = {
  asCurrentUser: {
    esql: { query: mockEsqlQuery },
  },
} as unknown as IScopedClusterClient;

const logger = { debug: jest.fn(), warn: jest.fn() } as unknown as Logger;

beforeEach(() => {
  jest.clearAllMocks();
  mockEsqlQuery.mockResolvedValue({ columns: [], values: [] });
});

describe('createCustomContentTemplateResolver — system prompt selection', () => {
  const resolve = createCustomContentTemplateResolver({ modelProvider, esClient, logger });

  it('uses the Liquid system prompt when hasExistingQuery is true and esqlQuery is omitted', async () => {
    mockChatComplete.mockResolvedValue({ content: '<div>{{ row["x"].value }}</div>' });

    await resolve({
      prompt: 'Change the colors',
      existingTemplate: '<div>{{ row["x"].value }}</div>',
      hasExistingQuery: true,
    });

    expect(mockEsqlQuery).not.toHaveBeenCalled();

    const systemArg: string = mockChatComplete.mock.calls[0][0].system;
    expect(systemArg).toContain('Liquid template syntax');
    expect(systemArg).not.toContain('Output ONLY valid HTML');
  });

  it('does not sample ES when hasExistingQuery is true and esqlQuery is omitted', async () => {
    mockChatComplete.mockResolvedValue({ content: '<div>ok</div>' });

    await resolve({ prompt: 'Restyle', hasExistingQuery: true });

    expect(mockEsqlQuery).not.toHaveBeenCalled();
  });

  it('uses the static system prompt when neither esqlQuery nor hasExistingQuery is set', async () => {
    mockChatComplete.mockResolvedValue({ content: '<div>hello</div>' });

    await resolve({ prompt: 'Show a KPI card' });

    const systemArg: string = mockChatComplete.mock.calls[0][0].system;
    expect(systemArg).toContain('Output ONLY valid HTML');
    expect(systemArg).not.toContain('Liquid template syntax');
  });
});

describe('createCustomContentTemplateResolver — output validation', () => {
  const resolve = createCustomContentTemplateResolver({ modelProvider, esClient, logger });

  it('returns the template when the LLM output is valid HTML', async () => {
    mockChatComplete.mockResolvedValue({ content: '<div>hello</div>' });

    const result = await resolve({ prompt: 'Show a KPI' });

    expect(result.template).toBe('<div>hello</div>');
  });

  it('throws when the LLM output contains a <script> tag', async () => {
    mockChatComplete.mockResolvedValue({
      content: '<html><body><script>alert(1)</script></body></html>',
    });

    await expect(resolve({ prompt: 'Show a KPI' })).rejects.toThrow(
      'Generated template was rejected: contains a <script> tag.'
    );
  });

  it('throws when the LLM output exceeds the byte limit', async () => {
    const oversized = 'a'.repeat(CUSTOM_CONTENT_MAX_TEMPLATE_BYTES + 1);
    mockChatComplete.mockResolvedValue({ content: oversized });

    await expect(resolve({ prompt: 'Show a KPI' })).rejects.toThrow(
      `Generated template was rejected: exceeds the ${CUSTOM_CONTENT_MAX_TEMPLATE_BYTES}-byte limit.`
    );
  });

  it('detects <SCRIPT> tags case-insensitively', async () => {
    mockChatComplete.mockResolvedValue({
      content: '<SCRIPT type="text/javascript">doEvil()</SCRIPT>',
    });

    await expect(resolve({ prompt: 'Show a KPI' })).rejects.toThrow(
      'Generated template was rejected: contains a <script> tag.'
    );
  });

  it('strips markdown code fences before storing the template', async () => {
    mockChatComplete.mockResolvedValue({
      content: '```html\n<div>hello</div>\n```',
    });

    const result = await resolve({ prompt: 'Show a KPI' });

    expect(result.template).toBe('<div>hello</div>');
    expect(result.template).not.toContain('```');
  });

  it('reads and strips the declared height', async () => {
    mockChatComplete.mockResolvedValue({
      content: '<!-- cc-height: 480 -->\n<div>hello</div>',
    });

    const result = await resolve({ prompt: 'Show a KPI' });

    expect(result.height).toBe(480);
    // The declaration is metadata about the template, not part of what renders.
    expect(result.template).toBe('<div>hello</div>');
  });

  it('reads the declared height through a markdown fence', async () => {
    mockChatComplete.mockResolvedValue({
      content: '```html\n<!-- cc-height: 400 -->\n<div>hello</div>\n```',
    });

    const result = await resolve({ prompt: 'Show a KPI' });

    expect(result.height).toBe(400);
    expect(result.template).toBe('<div>hello</div>');
  });

  it('falls back to the default height when none is declared', async () => {
    mockChatComplete.mockResolvedValue({ content: '<div>hello</div>' });

    const result = await resolve({ prompt: 'Show a KPI' });

    expect(result.height).toBe(CUSTOM_CONTENT_DEFAULT_HEIGHT);
    expect(result.template).toBe('<div>hello</div>');
  });

  // The value is model-authored, so it is clamped rather than trusted.
  it('clamps a declared height above the maximum', async () => {
    mockChatComplete.mockResolvedValue({
      content: '<!-- cc-height: 99999 -->\n<div>hello</div>',
    });

    expect((await resolve({ prompt: 'Show a KPI' })).height).toBe(CUSTOM_CONTENT_MAX_HEIGHT);
  });

  it('clamps a declared height below the minimum', async () => {
    mockChatComplete.mockResolvedValue({
      content: '<!-- cc-height: 5 -->\n<div>hello</div>',
    });

    expect((await resolve({ prompt: 'Show a KPI' })).height).toBe(CUSTOM_CONTENT_MIN_HEIGHT);
  });
});

describe('createCustomContentTemplateResolver — ES|QL sampling failures', () => {
  const resolve = createCustomContentTemplateResolver({ modelProvider, esClient, logger });

  const responseError = (type: string, statusCode: number, reason: string) =>
    new errors.ResponseError({
      statusCode,
      body: { error: { type, reason } },
      warnings: null,
      meta: {} as never,
    } as never);

  beforeEach(() => {
    mockChatComplete.mockResolvedValue({ content: '<div>ok</div>' });
  });

  // Without a sampled schema any generated template references invented columns, so every cause
  // fails rather than persisting a panel that only breaks at render time.
  it.each([
    [
      'a rejected query',
      responseError('verification_exception', 400, 'Unknown column [nope]'),
      /ES\|QL query is invalid: Unknown column \[nope\].*generate_esql/,
    ],
    [
      'unparseable syntax',
      responseError('parsing_exception', 400, 'line 1:6: mismatched input'),
      /ES\|QL query is invalid: line 1:6: mismatched input/,
    ],
    [
      'a permission error',
      responseError('security_exception', 403, 'action [indices:data/read/esql] is unauthorized'),
      /No access to the index targeted by this ES\|QL query/,
    ],
    ['a transient cluster error', new Error('socket hang up'), /Could not sample.*socket hang up/],
  ])('fails with a cause-specific message on %s', async (_label, error, expected) => {
    mockEsqlQuery.mockRejectedValue(error);

    await expect(resolve({ prompt: 'Show revenue', esqlQuery: 'FROM logs' })).rejects.toThrow(
      expected
    );
    expect(mockChatComplete).not.toHaveBeenCalled();
  });

  it('still generates a template when a valid query matches no rows', async () => {
    mockEsqlQuery.mockResolvedValue({ columns: [{ name: 'count', type: 'long' }], values: [] });

    await expect(
      resolve({ prompt: 'Show revenue', esqlQuery: 'FROM logs' })
    ).resolves.toMatchObject({ template: '<div>ok</div>' });
  });

  it('binds ?_tstart and ?_tend when sampling a time-picker query', async () => {
    await resolve({
      prompt: 'Show revenue',
      esqlQuery: 'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend',
    });

    expect(mockEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        params: [{ _tstart: expect.any(String) }, { _tend: expect.any(String) }],
      })
    );
  });

  it('sends no params for a query without time parameters', async () => {
    await resolve({ prompt: 'Show revenue', esqlQuery: 'FROM logs' });

    expect(mockEsqlQuery).toHaveBeenCalledWith(
      expect.not.objectContaining({ params: expect.anything() })
    );
  });
});
