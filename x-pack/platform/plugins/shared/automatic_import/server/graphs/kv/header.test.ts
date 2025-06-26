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
import { kvState } from '../../../__jest__/fixtures/kv';
import type { KVState } from '../../types';
import { handleHeader } from './header';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const exampleAnswer = {
  rfc: 'RFC2454',
  regex:
    '/(?:(d{4}[-]d{2}[-]d{2}[T]d{2}[:]d{2}[:]d{2}(?:.d{1,6})?(?:[+-]d{2}[:]d{2}|Z)?)|-)s(?:([w][wd.@-]*)|-)s(.*)$/',
  grok_pattern: '<%{NUMBER:priority}>%{NUMBER:version} %{GREEDYDATA:message}',
};

const model = new FakeLLM({
  response: JSON.stringify(exampleAnswer),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: KVState = kvState;

describe('Testing kv header', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest
          .fn()
          .mockReturnValue({ docs: [{ doc: { _source: { message: 'dummy=data' } } }] }),
      },
    },
  } as unknown as IScopedClusterClient;
  it('handleHeader()', async () => {
    const response = await handleHeader({ state, model, client });
    expect(response.grokPattern).toStrictEqual(
      '<%{NUMBER:priority}>%{NUMBER:version} %{GREEDYDATA:message}'
    );
    expect(response.lastExecutedChain).toBe('kvHeader');
  });
});
