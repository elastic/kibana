/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_MAX_TEMPLATE_BYTES } from '@kbn/custom-content-common';
import { createCustomContentTemplateResolver } from './custom_content_resolver';

const mockChatComplete = jest.fn();
const mockEsqlQuery = jest.fn();

const modelProvider = {
  getDefaultModel: jest.fn().mockResolvedValue({
    inferenceClient: { chatComplete: mockChatComplete },
  }),
} as any;

const esClient = {
  asCurrentUser: {
    esql: { query: mockEsqlQuery },
  },
} as any;

const logger = { debug: jest.fn() } as any;

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

    expect(result).toBe('<div>hello</div>');
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

    expect(result).toBe('<div>hello</div>');
    expect(result).not.toContain('```');
  });
});
