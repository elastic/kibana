/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { handleHeaderRegexValidate } from './validate';
import { kvState } from '../../../__jest__/fixtures/kv';
import { FakeLLM } from '@langchain/core/utils/testing';
import { ActionsClientChatOpenAI, ActionsClientSimpleChatModel } from '@kbn/langchain/server';

const model = new FakeLLM({
  response: JSON.stringify('exampleAnswer'),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

describe('handleHeaderRegexValidate', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn(),
      },
    },
  } as unknown as IScopedClusterClient;

  it('should return no errors when regex matches all samples', async () => {
    const state = {
      ...kvState,
      regex: /^\[(\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})\]\s(.*)$/,
      logSamples: [
        '[18/Feb/2025:22:39:18 +0000] CONNECT conn=73060729 from=10.212.230.59:56518 to=10.213.160.14:4389 protocol=LDAP',
        '[18/Feb/2025:22:39:16 +0000] CONNECT conn=20597223 from=10.192.194.224:55730 to=10.192.3.79:4389 protocol=LDAP',
      ],
    };

    const result = await handleHeaderRegexValidate({ state, model, client });

    expect(result).toEqual({
      regex: /^\[(\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})\]\s(.*)$/,
      errors: [],
      lastExecutedChain: 'kv_regex_validate',
    });
  });

  it('should return errors when regex does not match samples', async () => {
    const state = {
      ...kvState,
      regex: /foo/,
      logSamples: ['test line 1', 'test line 2'],
    };

    const result = await handleHeaderRegexValidate({ state, model, client });

    expect(result).toEqual({
      errors: [
        'Sample "test line 1" does not match the regex pattern',
        'Sample "test line 2" does not match the regex pattern',
      ],
      lastExecutedChain: 'kv_regex_validate',
    });
  });
});
