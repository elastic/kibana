/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleUnstructured } from './unstructured';
import type { UnstructuredLogState } from '../../types';
import {
  unstructuredLogState,
  unstructuredLogResponse,
} from '../../../__jest__/fixtures/unstructured';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const model = new FakeLLM({
  response: JSON.stringify(unstructuredLogResponse, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: UnstructuredLogState = unstructuredLogState;

describe('Testing unstructured log handling node', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn(),
      },
    },
  } as unknown as IScopedClusterClient;
  it('handleUnstructured()', async () => {
    const response = await handleUnstructured({ state, model, client });
    expect(response.currentPattern).toStrictEqual(unstructuredLogResponse.grok_pattern);
    expect(response.isFirst).toBe(false);
    expect(response.lastExecutedChain).toBe('handleUnstructured');
  });

  it('should use unParsedSamples when isFirst is false', async () => {
    const modifiedState = {
      ...state,
      isFirst: false,
      unParsedSamples: ['unparsed log 1', 'unparsed log 2'],
    };
    const response = await handleUnstructured({ state: modifiedState, model, client });
    expect(response.currentPattern).toBeDefined();
    expect(response.isFirst).toBe(false);
    expect(response.lastExecutedChain).toBe('handleUnstructured');
  });

  it('should limit samples to maximum of 5', async () => {
    const modifiedState = {
      ...state,
      logSamples: ['log1', 'log2', 'log3', 'log4', 'log5', 'log6', 'log7'],
    };
    const response = await handleUnstructured({ state: modifiedState, model, client });
    expect(response.currentPattern).toBeDefined();
    expect(response.isFirst).toBe(false);
    expect(response.lastExecutedChain).toBe('handleUnstructured');
  });
});
