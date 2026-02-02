/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { processVertexStream, processVertexResponse } from './process_vertex_stream';
import type { GenerateContentResponseChunk, GenerateContentResponse } from './types';

describe('processVertexStream', () => {
  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  it('completes when the source completes', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const source$ = hot<GenerateContentResponseChunk>('----|');

      const processed$ = source$.pipe(processVertexStream());

      expectObservable(processed$).toBe('----|');
    });
  });

  it('emits a chunk event when the source emits content', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunk: GenerateContentResponseChunk = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'some chunk' }] } }],
      };

      const source$ = hot<GenerateContentResponseChunk>('--a', { a: chunk });

      const processed$ = source$.pipe(processVertexStream());

      expectObservable(processed$).toBe('--a', {
        a: {
          content: 'some chunk',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      });
    });
  });

  it('emits a chunk event when the source emits a function call', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunk: GenerateContentResponseChunk = {
        candidates: [
          {
            index: 0,
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'func1', args: { arg1: true } } }],
            },
          },
        ],
      };

      const source$ = hot<GenerateContentResponseChunk>('--a', { a: chunk });

      const processed$ = source$.pipe(processVertexStream());

      expectObservable(processed$).toBe('--a', {
        a: {
          content: '',
          tool_calls: [
            {
              index: 0,
              toolCallId: expect.any(String),
              function: { name: 'func1', arguments: JSON.stringify({ arg1: true }) },
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      });
    });
  });

  it('emits a token count event when the source emits content with usageMetadata', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunk: GenerateContentResponseChunk = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'last chunk' }] } }],
        usageMetadata: {
          candidatesTokenCount: 1,
          promptTokenCount: 2,
          totalTokenCount: 3,
        },
      };

      const source$ = hot<GenerateContentResponseChunk>('--a', { a: chunk });

      const processed$ = source$.pipe(processVertexStream());

      expectObservable(processed$).toBe('--(ab)', {
        a: {
          content: 'last chunk',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        b: {
          tokens: {
            completion: 1,
            prompt: 2,
            total: 3,
          },
          type: ChatCompletionEventType.ChatCompletionTokenCount,
        },
      });
    });
  });

  it('emits for multiple chunks', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunkA: GenerateContentResponseChunk = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'chunk A' }] } }],
      };
      const chunkB: GenerateContentResponseChunk = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'chunk B' }] } }],
      };
      const chunkC: GenerateContentResponseChunk = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'chunk C' }] } }],
      };

      const source$ = hot<GenerateContentResponseChunk>('-a--b---c-|', {
        a: chunkA,
        b: chunkB,
        c: chunkC,
      });

      const processed$ = source$.pipe(processVertexStream());

      expectObservable(processed$).toBe('-a--b---c-|', {
        a: {
          content: 'chunk A',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        b: {
          content: 'chunk B',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        c: {
          content: 'chunk C',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      });
    });
  });
});

describe('processVertexResponse', () => {
  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  it('completes when the source completes', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const source$ = hot<GenerateContentResponse>('----|');

      const processed$ = source$.pipe(processVertexResponse());

      expectObservable(processed$).toBe('----|');
    });
  });

  it('emits a chunk event when the source emits content', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunk: GenerateContentResponse = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'some chunk' }] } }],
      };

      const source$ = hot<GenerateContentResponseChunk>('--a', { a: chunk });

      const processed$ = source$.pipe(processVertexResponse());

      expectObservable(processed$).toBe('--a', {
        a: {
          content: 'some chunk',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      });
    });
  });

  it('emits a chunk event when the source emits a function call', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunk: GenerateContentResponse = {
        candidates: [
          {
            index: 0,
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'func1', args: { arg1: true } } }],
            },
          },
        ],
      };

      const source$ = hot<GenerateContentResponse>('--a', { a: chunk });

      const processed$ = source$.pipe(processVertexResponse());

      expectObservable(processed$).toBe('--a', {
        a: {
          content: '',
          tool_calls: [
            {
              index: 0,
              toolCallId: expect.any(String),
              function: { name: 'func1', arguments: JSON.stringify({ arg1: true }) },
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      });
    });
  });

  it('emits a token count event when the source emits content with usageMetadata', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const chunk: GenerateContentResponse = {
        candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'last chunk' }] } }],
        usageMetadata: {
          candidatesTokenCount: 1,
          promptTokenCount: 2,
          totalTokenCount: 3,
        },
      };

      const source$ = hot<GenerateContentResponse>('--a', { a: chunk });

      const processed$ = source$.pipe(processVertexResponse());

      expectObservable(processed$).toBe('--(ab)', {
        a: {
          content: 'last chunk',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        b: {
          tokens: {
            completion: 1,
            prompt: 2,
            total: 3,
          },
          type: ChatCompletionEventType.ChatCompletionTokenCount,
        },
      });
    });
  });
});
