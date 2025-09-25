/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FakeLLM } from '@langchain/core/utils/testing';
import { celTestState } from '../../../__jest__/fixtures/cel';
import type { CelInputState } from '../../types';
import { handleUpdateProgramOauth2 } from './auth_oauth2';
import type { InferenceChatModel } from '@kbn/inference-langchain';

const model = new FakeLLM({
  response: 'my_updated_cel_program',
}) as unknown as InferenceChatModel;

const state: CelInputState = celTestState;

describe('Testing cel handler', () => {
  it('handleUpdateProgramOauth2()', async () => {
    const response = await handleUpdateProgramOauth2({ state, model });
    expect(response.currentProgram).toStrictEqual('my_updated_cel_program');
    expect(response.lastExecutedChain).toBe('updateProgramOAuth2');
  });
});
