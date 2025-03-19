/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleErrors } from './errors';
import type { CategorizationState } from '../../types';
import {
  categorizationTestState,
  categorizationMockProcessors,
  categorizationExpectedHandlerResponse,
} from '../../../__jest__/fixtures/categorization';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

const model = new FakeLLM({
  response: JSON.stringify(categorizationMockProcessors, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: CategorizationState = categorizationTestState;

describe('Testing categorization handler', () => {
  it('handleErrors()', async () => {
    const response = await handleErrors({ state, model });
    expect(response.currentPipeline).toStrictEqual(
      categorizationExpectedHandlerResponse.currentPipeline
    );
    expect(response.lastExecutedChain).toBe('error');
  });
});
