/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleUnstructuredValidate } from './validate';
import type { UnstructuredLogState } from '../../types';
import {
  unstructuredLogState,
  unstructuredLogResponse,
} from '../../../__jest__/fixtures/unstructured';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const model = new FakeLLM({
  response: JSON.stringify(unstructuredLogResponse, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: UnstructuredLogState = unstructuredLogState;

describe('Testing unstructured validation without errors', () => {
  it('handleUnstructuredValidate() without errors', async () => {
    const client = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockReturnValue({
            docs: [
              {
                doc: {
                  _source: { testPackage: { testDatastream: { message: 'dummy data' } } },
                },
              },
            ],
          }),
        },
      },
    } as unknown as IScopedClusterClient;
    const response = await handleUnstructuredValidate({ state, model, client });
    expect(response.jsonSamples).toStrictEqual(unstructuredLogState.jsonSamples);
    expect(response.additionalProcessors).toStrictEqual([
      {
        grok: {
          field: 'message',
          patterns: unstructuredLogState.grokPatterns,
          tag: 'grok_header_pattern',
        },
      },
    ]);
    expect(response.errors).toStrictEqual(undefined);
    expect(response.lastExecutedChain).toBe('unstructuredValidate');
  });
});

describe('Testing unstructured validation errors', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest
          .fn()
          .mockReturnValue({ docs: [{ doc: { _source: { error: 'some error' } } }] }),
      },
    },
  } as unknown as IScopedClusterClient;

  it('handleUnstructuredValidate() errors', async () => {
    const response = await handleUnstructuredValidate({ state, model, client });
    expect(response.errors).toStrictEqual(['some error']);
    expect(response.lastExecutedChain).toBe('unstructuredValidate');
  });
});
describe('Testing unstructured validation with mixed results', () => {
  it('handleUnstructuredValidate() with some valid and invalid samples', async () => {
    const client = {
      asCurrentUser: {
        ingest: {
          simulate: jest
            .fn()
            .mockReturnValueOnce({
              docs: [
                {
                  doc: {
                    _source: { testPackage: { testDatastream: { message: 'valid sample' } } },
                  },
                },
              ],
            })
            .mockReturnValueOnce({
              docs: [
                {
                  doc: {
                    _source: { error: 'parsing error' },
                  },
                },
              ],
            }),
        },
      },
    } as unknown as IScopedClusterClient;
    const testState = {
      ...state,
      logSamples: ['valid log', 'invalid log'],
      currentPattern: '%{GREEDYDATA:message}',
      packageName: 'testPackage',
      dataStreamName: 'testDatastream',
    };

    const response = await handleUnstructuredValidate({ state: testState, model, client });

    expect(response.unParsedSamples).toEqual(['invalid log']);
    expect(response.errors).toEqual(['parsing error']);
    expect(response.lastExecutedChain).toBe('unstructuredValidate');
    expect(client.asCurrentUser.ingest.simulate).toHaveBeenCalledTimes(2);
  });
  describe('Testing unstructured validation with empty samples', () => {
    const client = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn(),
        },
      },
    } as unknown as IScopedClusterClient;

    it('handleUnstructuredValidate() with empty log samples', async () => {
      const testState = {
        ...state,
        logSamples: [],
        currentPattern: '',
        grokPatterns: [],
      };

      const response = await handleUnstructuredValidate({ state: testState, model, client });
      expect(response.jsonSamples).toStrictEqual([]);
      expect(response.unParsedSamples).toStrictEqual([]);
      expect(response.lastExecutedChain).toBe('unstructuredValidate');
      expect(client.asCurrentUser.ingest.simulate).not.toHaveBeenCalled();
    });
  });

  describe('Testing unstructured validation with multiple patterns', () => {
    const client = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockReturnValue({
            docs: [
              {
                doc: {
                  _source: {
                    testPackage: { testDatastream: { field1: 'value1', field2: 'value2' } },
                  },
                },
              },
            ],
          }),
        },
      },
    } as unknown as IScopedClusterClient;

    it('handleUnstructuredValidate() with multiple grok patterns', async () => {
      const testState = {
        ...state,
        grokPatterns: ['pattern1', 'pattern2'],
        currentPattern: 'pattern3',
        logSamples: ['test log'],
        packageName: 'testPackage',
        dataStreamName: 'testDatastream',
      };

      const response = await handleUnstructuredValidate({ state: testState, model, client });
      expect(response.jsonSamples).toHaveLength(1);
      expect(response.lastExecutedChain).toBe('unstructuredValidate');
    });
  });

  describe('Testing unstructured validation with invalid JSON samples', () => {
    const client = {
      asCurrentUser: {
        ingest: {
          simulate: jest.fn().mockReturnValue({
            docs: [
              {
                doc: {
                  _source: { testPackage: { testDatastream: undefined } },
                },
              },
            ],
          }),
        },
      },
    } as unknown as IScopedClusterClient;

    it('handleUnstructuredValidate() should handle invalid JSON samples', async () => {
      const testState = {
        ...state,
        logSamples: ['invalid json log'],
        currentPattern: '%{GREEDYDATA:message}',
        packageName: 'testPackage',
        dataStreamName: 'testDatastream',
      };

      const response = await handleUnstructuredValidate({ state: testState, model, client });
      expect(response.jsonSamples).toEqual([undefined]);
      expect(response.lastExecutedChain).toBe('unstructuredValidate');
    });
  });
});
