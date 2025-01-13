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
import { handleBuildProgram } from './build_program';

const model = new FakeLLM({
  response: 'my_cel_program',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: CelInputState = celTestState;

describe('Testing cel handler', () => {
  it('handleBuildProgram()', async () => {
    const response = await handleBuildProgram({ state, model });
    expect(response.currentProgram).toStrictEqual('my_cel_program');
    expect(response.lastExecutedChain).toBe('buildCelProgram');
  });
});
