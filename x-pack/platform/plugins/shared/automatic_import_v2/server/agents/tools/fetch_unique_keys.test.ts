/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fetchUniqueKeysTool } from './fetch_unique_keys';

jest.mock('@langchain/langgraph', () => {
  const actual = jest.requireActual('@langchain/langgraph');
  return {
    ...actual,
    getCurrentTaskInput: jest.fn(),
  };
});

import { getCurrentTaskInput } from '@langchain/langgraph';

const getCurrentTaskInputMock = getCurrentTaskInput as jest.Mock;

describe('fetchUniqueKeysTool', () => {
  it('returns empty unique_keys when there are no pipeline results', async () => {
    getCurrentTaskInputMock.mockReturnValue({
      pipeline_generation_results: [],
    });

    const tool = fetchUniqueKeysTool();
    const cmd = await (tool as any).func({}, undefined, { toolCall: { id: 'tool-call-id' } });

    const message = cmd.update.messages[0];
    expect(JSON.parse(message.content)).toEqual({ unique_keys: {} });
  });

  it('collects keys (and sample values) from doc._source', async () => {
    const result: estypes.IngestSimulateDocumentResult = {
      doc: {
        _id: '1',
        _index: 'idx',
        _ingest: {} as any,
        _source: {
          message: 'hello',
          foo: 123,
          bar: { baz: 'qux' },
        },
      } as any,
    };

    getCurrentTaskInputMock.mockReturnValue({
      pipeline_generation_results: [result],
    });

    const tool = fetchUniqueKeysTool();
    const cmd = await (tool as any).func({}, undefined, { toolCall: { id: 'tool-call-id' } });
    const message = cmd.update.messages[0];
    const parsed = JSON.parse(message.content);

    expect(parsed).toEqual({
      unique_keys: {
        bar: { baz: 'qux' },
        'bar.baz': 'qux',
        foo: 123,
        message: 'hello',
      },
    });
  });

  it('skips results without doc but still returns keys from others', async () => {
    const withErrorOnly: estypes.IngestSimulateDocumentResult = {
      error: {} as any,
    };

    const withDoc: estypes.IngestSimulateDocumentResult = {
      doc: {
        _id: '2',
        _index: 'idx',
        _ingest: {} as any,
        _source: { a: 'b' },
      } as any,
    };

    getCurrentTaskInputMock.mockReturnValue({
      pipeline_generation_results: [withErrorOnly, withDoc],
    });

    const tool = fetchUniqueKeysTool();
    const cmd = await (tool as any).func({}, undefined, { toolCall: { id: 'tool-call-id' } });
    const message = cmd.update.messages[0];
    const parsed = JSON.parse(message.content);

    expect(parsed).toEqual({ unique_keys: { a: 'b' } });
  });
});
