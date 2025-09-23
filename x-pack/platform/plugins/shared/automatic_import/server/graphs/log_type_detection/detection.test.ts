/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { logFormatDetectionTestState } from '../../../__jest__/fixtures/log_type_detection';
import type { LogFormatDetectionState } from '../../types';
import { handleLogFormatDetection } from './detection';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { InferenceChatModel } from '@kbn/inference-langchain';

const model = new FakeLLM({
  response: '{ "name": "structured"}',
}) as unknown as InferenceChatModel;

const state: LogFormatDetectionState = logFormatDetectionTestState;

describe('Testing log type detection handler', () => {
  it('handleLogFormatDetection()', async () => {
    const client = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn(),
        },
      },
    } as unknown as IScopedClusterClient;

    const response = await handleLogFormatDetection({ state, model, client });
    expect(response.samplesFormat).toStrictEqual({ name: 'structured', header: false });
    expect(response.lastExecutedChain).toBe('logFormatDetection');
  });
});
