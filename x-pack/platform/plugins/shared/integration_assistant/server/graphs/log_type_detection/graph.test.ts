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
import { getLogFormatDetectionGraph } from './graph';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const model = new FakeLLM({
  response: '{"log_type": "structured"}',
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

describe('LogFormatDetectionGraph', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn(),
      },
    },
  } as unknown as IScopedClusterClient;
  describe('Compiling and Running', () => {
    it('Ensures that the graph compiles', async () => {
      // When getLogFormatDetectionGraph runs, langgraph compiles the graph it will error if the graph has any issues.
      // Common issues for example detecting a node has no next step, or there is a infinite loop between them.
      await getLogFormatDetectionGraph({ model, client });
    });
  });
});
