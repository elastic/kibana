/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FakeLLM } from '@langchain/core/utils/testing';
import { apiAnalysisTestState } from '../../../__jest__/fixtures/api_analysis';
import type { ApiAnalysisState } from '../../types';
import { handleGetSuggestedPaths } from './paths';
import type { InferenceChatModel } from '@kbn/inference-langchain';

const model = new FakeLLM({
  response: '[ "/path1", "/path2" ]',
}) as unknown as InferenceChatModel;

const state: ApiAnalysisState = apiAnalysisTestState;

describe('Testing api analysis handler', () => {
  it('handleGetSuggestedPaths()', async () => {
    const response = await handleGetSuggestedPaths({ state, model });
    expect(response.suggestedPaths).toStrictEqual(['/path1', '/path2']);
    expect(response.lastExecutedChain).toBe('getSuggestedPaths');
  });
});
