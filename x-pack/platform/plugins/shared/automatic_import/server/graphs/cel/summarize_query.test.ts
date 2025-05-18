/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { FakeLLM } from '@langchain/core/utils/testing';
import { celTestState } from '../../../__jest__/fixtures/cel';
import type { CelInputState } from '../../types';
import { handleSummarizeQuery } from './summarize_query';

const model = new FakeLLM({
  response: 'my_api_query_summary',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: CelInputState = celTestState;

describe('Testing cel handler', () => {
  it('handleSummarizeQuery()', async () => {
    const response = await handleSummarizeQuery({ state, model });
    expect(response.apiQuerySummary).toStrictEqual('my_api_query_summary');
    expect(response.lastExecutedChain).toBe('summarizeQuery');
  });
});
