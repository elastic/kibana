/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { extractJson, translateNlToEsDsl } from './nl_to_es_dsl';

describe('translateNlToEsDsl', () => {
  const createMockInferenceClient = (content: string) => ({
    chatComplete: jest.fn().mockResolvedValue({ content }),
    output: jest.fn(),
  });

  it('parses valid JSON response', async () => {
    const client = createMockInferenceClient('{ "query": { "match_all": {} }, "size": 10 }');
    const result = await translateNlToEsDsl({
      nlQuery: 'show me recent docs',
      inferenceClient: client as unknown as BoundInferenceClient,
      availableFields: '@timestamp (date, aggregatable)',
    });
    expect(result).toEqual({ query: { match_all: {} }, size: 10 });
  });

  it('passes all fields through (query, aggs, sort, size, _warning)', async () => {
    const response = JSON.stringify({
      query: { match_all: {} },
      aggs: { by_level: { terms: { field: 'log.level', size: 5 } } },
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 0,
      _warning: 'Field is unmapped',
    });
    const client = createMockInferenceClient(response);
    const result = await translateNlToEsDsl({
      nlQuery: 'top 5 log levels',
      inferenceClient: client as unknown as BoundInferenceClient,
      availableFields: 'log.level (keyword, aggregatable)',
    });
    expect(result.query).toEqual({ match_all: {} });
    expect(result.aggs).toBeDefined();
    expect(result.sort).toBeDefined();
    expect(result.size).toBe(0);
    expect(result._warning).toBe('Field is unmapped');
  });

  it('handles markdown-fenced JSON response', async () => {
    const client = createMockInferenceClient('```json\n{ "size": 5 }\n```');
    const result = await translateNlToEsDsl({
      nlQuery: 'show 5 docs',
      inferenceClient: client as unknown as BoundInferenceClient,
      availableFields: '',
    });
    expect(result.size).toBe(5);
  });

  it('throws on non-JSON response with raw snippet', async () => {
    const client = createMockInferenceClient('I cannot help with that');
    await expect(
      translateNlToEsDsl({
        nlQuery: 'something',
        inferenceClient: client as unknown as BoundInferenceClient,
        availableFields: '',
      })
    ).rejects.toThrow(/Failed to parse LLM response/);
  });

  it('throws on null content', async () => {
    const client = {
      chatComplete: jest.fn().mockResolvedValue({ content: null }),
      output: jest.fn(),
    };
    await expect(
      translateNlToEsDsl({
        nlQuery: 'test',
        inferenceClient: client as unknown as BoundInferenceClient,
        availableFields: '',
      })
    ).rejects.toThrow(/Failed to parse LLM response/);
  });

  it('includes available fields in the user message', async () => {
    const client = createMockInferenceClient('{ "size": 1 }');
    await translateNlToEsDsl({
      nlQuery: 'show me docs',
      inferenceClient: client as unknown as BoundInferenceClient,
      availableFields: 'host.name (keyword, aggregatable)',
    });
    const call = client.chatComplete.mock.calls[0][0];
    expect(call.messages[0].content).toContain('host.name (keyword, aggregatable)');
    expect(call.messages[0].content).toContain('show me docs');
  });
});

describe('extractJson', () => {
  it('returns plain JSON as-is', () => {
    const input = '{ "query": { "match_all": {} } }';
    expect(extractJson(input)).toBe('{ "query": { "match_all": {} } }');
  });

  it('extracts JSON from markdown-fenced block', () => {
    const input = '```json\n{ "size": 10 }\n```';
    expect(extractJson(input)).toBe('{ "size": 10 }');
  });

  it('extracts JSON from fenced block without language tag', () => {
    const input = '```\n{ "size": 5 }\n```';
    expect(extractJson(input)).toBe('{ "size": 5 }');
  });

  it('trims surrounding whitespace', () => {
    const input = '  \n { "query": {} } \n  ';
    expect(extractJson(input)).toBe('{ "query": {} }');
  });

  it('handles fenced block with extra whitespace', () => {
    const input = '```json\n  { "size": 1 }  \n```';
    expect(extractJson(input)).toBe('{ "size": 1 }');
  });
});
