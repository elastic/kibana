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
import { handleKV } from './kv';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const model = new FakeLLM({
  response: JSON.stringify('exampleAnswer'),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: KVState = kvState;

describe('Testing kv header', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn().mockReturnValue({
          docs: [
            {
              doc: {
                _source: [
                  {
                    kv: {
                      field: 'message',
                      field_split: '',
                      target_field: 'testPackage.testDatastream',
                      trim_key: '',
                      trim_value: '',
                      value_split: '',
                    },
                  },
                ],
              },
            },
          ],
        }),
      },
    },
  } as unknown as IScopedClusterClient;
  it('handleKV()', async () => {
    const response = await handleKV({ state, model, client });
    expect(response.kvProcessor).toStrictEqual([
      {
        kv: {
          field: 'message',
          field_split: '',
          target_field: 'testPackage.testDatastream',
          trim_key: '',
          trim_value: '',
          value_split: '',
        },
      },
    ]);
    expect(response.lastExecutedChain).toBe('handleKV');
  });
});
