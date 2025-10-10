/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { ecsTestState } from '../../../__jest__/fixtures/ecs_mapping';
import type { EcsMappingState } from '../../types';
import { handleEcsMapping } from './mapping';
import type { InferenceChatModel } from '@kbn/inference-langchain';

const model = new FakeLLM({
  response: '{ "message": "ll callback later."}',
}) as unknown as InferenceChatModel;

const state: EcsMappingState = ecsTestState;

describe('Testing ecs handler', () => {
  it('handleEcsMapping()', async () => {
    const response = await handleEcsMapping({ state, model });
    expect(response.currentMapping).toStrictEqual({ message: 'll callback later.' });
    expect(response.lastExecutedChain).toBe('ecsMapping');
  });
});
