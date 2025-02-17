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
import {
  celExpectedResults,
  celStateDetailsMockedResponse,
  celTestState,
} from '../../../__jest__/fixtures/cel';
import type { CelInputState } from '../../types';
import { handleGetStateDetails } from './retrieve_state_details';

const model = new FakeLLM({
  response: JSON.stringify(celStateDetailsMockedResponse, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: CelInputState = celTestState;

describe('Testing cel handler', () => {
  it('handleGetStateDetails()', async () => {
    const response = await handleGetStateDetails({ state, model });
    expect(response.stateSettings).toStrictEqual(celExpectedResults.stateSettings);
    expect(response.redactVars).toStrictEqual(celExpectedResults.redactVars);
    expect(response.configFields).toStrictEqual(celExpectedResults.configFields);
    expect(response.lastExecutedChain).toBe('getStateDetails');
  });
});
