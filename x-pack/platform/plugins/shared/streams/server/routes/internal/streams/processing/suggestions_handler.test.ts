/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleProcessingSuggestion, extractAndGroupPatterns } from './suggestions_handler';
import { simulateProcessing } from './simulation_handler';
import { InferenceClient } from '@kbn/inference-plugin/server';
import { ScopedClusterClient } from '@kbn/core-elasticsearch-client-server-internal';
import { StreamsClient } from '../../../../lib/streams/client';

jest.mock('./simulation_handler', () => ({
  simulateProcessing: jest.fn((params) =>
    Promise.resolve({
      is_non_additive_simulation: false,
      success_rate: 1,
      simulationField: 'dummy',
      // include any simulation-specific response details if necessary
    })
  ),
}));

describe('handleProcessingSuggestion', () => {
  const dummyChatResponse = {
    output: {
      // This rule will be sanitized from message -> message_derived.
      rules: [{ parsing_rule: '%{common:message}' }],
    },
  };

  let inferenceClientMock: jest.Mocked<InferenceClient>;

  const scopedClusterClientMock = {} as unknown as ScopedClusterClient;
  const streamsClientMock = {} as unknown as StreamsClient;

  const field = 'message';
  const sample1 = { message: 'Error 100: foo' };
  const sample2 = { message: 'Error 101: bar' };

  const body = {
    field,
    samples: [sample1, sample2],
    connectorId: 'connector1',
  };

  beforeEach(() => {
    (simulateProcessing as jest.Mock).mockClear();
    inferenceClientMock = {
      output: jest.fn().mockResolvedValue(dummyChatResponse),
    } as unknown as jest.Mocked<InferenceClient>;
  });

  it('processes samples correctly and returns expected simulation results', async () => {
    const result = await handleProcessingSuggestion(
      'test',
      body,
      inferenceClientMock,
      scopedClusterClientMock,
      streamsClientMock
    );

    // The inferenceClient mock should be called once per unique group.
    expect(inferenceClientMock.output).toHaveBeenCalledTimes(1);

    const expectedSanitized = '%{common:message_derived}';

    result.simulations.forEach((sim: any) => {
      expect(sim).toHaveProperty('pattern', expectedSanitized);
    });

    // Also, the patterns array should reflect the sanitized rule once.
    expect(result.patterns).toEqual([expectedSanitized]);
  });

  it('limits example values to 8 per group', async () => {
    // Create 10 distinct messages that produce the same pattern via evalPattern
    const messages = Array.from({ length: 100 }, (_, i) => ({
      message: `Error ${111 + i}: foo${i}`,
    }));
    const newBody = {
      field: 'message',
      samples: messages,
      connectorId: 'connector1',
    };

    await handleProcessingSuggestion(
      'test',
      newBody,
      inferenceClientMock,
      scopedClusterClientMock,
      streamsClientMock
    );

    expect(inferenceClientMock.output).toHaveBeenCalledTimes(1);
    const calledArgs = inferenceClientMock.output.mock.calls[0][0];
    const inputText = calledArgs.input as string;

    // Extract example lines between "Logs:" and "Given the raw messages"
    const inputBlockMatch = inputText.match(/Logs:\s*([\s\S]*?)\s*Given the raw messages/);
    expect(inputBlockMatch).not.toBeNull();
    const examplesBlock = inputBlockMatch![1].trim();
    const exampleLines = examplesBlock
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    expect(exampleLines.length).toBeLessThanOrEqual(8);
  });

  it('processes two distinct groups and returns multiple patterns', async () => {
    // Group one: messages with comma, Group two: messages with colon
    const groupOneMessages = Array.from({ length: 5 }, (_, i) => ({
      message: `Error 123, foo${i}`,
    }));
    const groupTwoMessages = Array.from({ length: 5 }, (_, i) => ({
      message: `[2025-02-02T12:00:00] Warning 456: bar${i}`,
    }));
    const newBody = {
      field: 'message',
      samples: [...groupOneMessages, ...groupTwoMessages],
      connectorId: 'connector1',
    };

    // Setup inferenceClientMock to return a different chat response for each group
    inferenceClientMock.output
      .mockImplementationOnce(async () => ({
        output: { rules: [{ parsing_rule: '%{common:message}' }] },
        id: '',
        content: '',
      }))
      .mockImplementationOnce(async () => ({
        output: { rules: [{ parsing_rule: '%{other:pattern}' }] },
        id: '',
        content: '',
      }));

    const result = await handleProcessingSuggestion(
      'test',
      newBody,
      inferenceClientMock as InferenceClient,
      scopedClusterClientMock,
      streamsClientMock
    );

    // Expect that the inferenceClientMock is called twice, once per group.
    expect(inferenceClientMock.output).toHaveBeenCalledTimes(2);

    expect(result.patterns).toEqual(['%{common:message_derived}', '%{other:pattern}']);

    result.simulations.forEach((sim: any) => {
      expect(['%{common:message_derived}', '%{other:pattern}']).toContain(sim.pattern);
    });
  });

  it('filters out simulation when simulateProcessing returns an unsuccessful result', async () => {
    const messages = [{ message: 'Error 999: failed' }, { message: 'Error 999: failed duplicate' }];
    const newBody = {
      field: 'message',
      samples: messages,
      connectorId: 'connector1',
    };

    inferenceClientMock.output.mockResolvedValueOnce({
      output: { rules: [{ parsing_rule: '%{common:message}' }] },
      id: '',
      content: '',
    });

    (simulateProcessing as jest.Mock).mockImplementationOnce(async () => ({
      is_non_additive_simulation: false,
      success_rate: 0,
      simulationField: 'dummy',
    }));

    const result = await handleProcessingSuggestion(
      'test',
      newBody,
      inferenceClientMock as InferenceClient,
      scopedClusterClientMock,
      streamsClientMock
    );

    // Expect that unsuccessful simulation is filtered, so no simulation is returned.
    expect(result.simulations.length).toBe(0);
    expect(result.patterns).toEqual([]);
  });
});

describe('extractAndGroupPatterns', () => {
  it('groups samples correctly, limits exampleValues to 8 and produces expected truncatedPattern', () => {
    // Create six groups with distinctive messages.
    const createSample = (msg: string) => ({
      // uniform message with random stuff and long tail to test cut-off of truncatedPattern
      message: `${Math.random()} ${msg} 0123 Test 123 long 123 pattern 123`,
    });
    const group1Msg = 'Alpha001: test!';
    const group2Msg = 'Beta002, check?';
    const group3Msg = 'Gamma003; verify.';
    const group4Msg = 'Delta004- confirm';
    const group5Msg = 'Epsilon005/ proceed';
    const group6Msg = 'Zeta006| complete';

    // Create groups with varying counts
    const group1 = Array.from({ length: 9 }, () => createSample(group1Msg));
    const group2 = Array.from({ length: 5 }, () => createSample(group2Msg));
    const group3 = Array.from({ length: 3 }, () => createSample(group3Msg));
    const group4 = Array.from({ length: 4 }, () => createSample(group4Msg));
    const group5 = Array.from({ length: 7 }, () => createSample(group5Msg));
    const group6 = Array.from({ length: 8 }, () => createSample(group6Msg));

    // Combine all samples
    const samples = [...group1, ...group2, ...group3, ...group4, ...group5, ...group6];

    // Calculate expected truncatedPatterns for each group.
    const expectedG1 = 'p f: a! 0 ';
    const expectedG2 = 'p f, a? 0 ';
    // Group 3 has only 3 samples, so it should not be in the top 5.
    const expectedG4 = 'p f- a 0 a';
    const expectedG5 = 'p f/ a 0 a';
    const expectedG6 = 'p f| a 0 a';

    const expectedTruncs = [expectedG1, expectedG6, expectedG5, expectedG2, expectedG4];

    const result = extractAndGroupPatterns(samples, 'message');

    expect(result.length).toBe(5);

    result.forEach((group) => {
      expect(group.count).toBeGreaterThan(0);
      expect(group.exampleValues.length).toBeLessThanOrEqual(8);
      expect(group.truncatedPattern.length).toBeLessThanOrEqual(10);
      // Ensure the truncatedPattern is one of the expected top five.
      expect(expectedTruncs).toContain(group.truncatedPattern);
    });
  });
});
