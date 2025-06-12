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
import { handleGetStateVariables } from './retrieve_state_vars';

const model = new FakeLLM({
  response: '[ "my_state_var", "url" ]',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: CelInputState = celTestState;

describe('Testing cel handler', () => {
  it('handleGetStateVariables()', async () => {
    const response = await handleGetStateVariables({ state, model });
    expect(response.stateVarNames).toStrictEqual(['my_state_var']);
    expect(response.lastExecutedChain).toBe('getStateVars');
  });
});
