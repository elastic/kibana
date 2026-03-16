/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { simulateConversations, type SimulatorConfig } from './simulator';
import { NOVICE_PERSONA, EXPERT_PERSONA, ADVERSARIAL_PERSONA } from './personas';
import type { BoundInferenceClient } from '@kbn/inference-common';

const createMockInferenceClient = (
  turns: Array<{ role: 'user' | 'assistant'; content: string }>
): BoundInferenceClient => {
  const outputFn = jest.fn().mockResolvedValue({
    id: 'conversation_sim',
    output: { turns },
    content: '',
  });

  return { output: outputFn, bindTo: jest.fn() } as unknown as BoundInferenceClient;
};

const createEmptyMockClient = (): BoundInferenceClient => {
  const outputFn = jest.fn().mockResolvedValue({
    id: 'conversation_sim',
    output: { turns: [] },
    content: '',
  });
  return { output: outputFn, bindTo: jest.fn() } as unknown as BoundInferenceClient;
};

describe('simulateConversations', () => {
  const sampleTurns = [
    { role: 'user' as const, content: 'Hello, how do I search?' },
    { role: 'assistant' as const, content: 'You can use the search bar at the top.' },
    { role: 'user' as const, content: 'Thanks, what about filters?' },
    { role: 'assistant' as const, content: 'Filters are available in the sidebar.' },
  ];

  it('generates the requested number of conversations', async () => {
    const client = createMockInferenceClient(sampleTurns);
    const config: SimulatorConfig = {
      conversationCount: 3,
      turnsPerConversation: 2,
      topic: 'searching data',
    };

    const dataset = await simulateConversations(NOVICE_PERSONA, client, config);

    expect(dataset.examples).toHaveLength(3);
    expect(client.output).toHaveBeenCalledTimes(3);
  });

  it('includes persona and topic metadata in each example', async () => {
    const client = createMockInferenceClient(sampleTurns);
    const config: SimulatorConfig = {
      conversationCount: 1,
      turnsPerConversation: 2,
      topic: 'dashboards',
    };

    const dataset = await simulateConversations(EXPERT_PERSONA, client, config);
    const example = dataset.examples[0];

    expect(example.metadata?.persona).toBe('expert');
    expect(example.metadata?.generated).toBe(true);
    expect(example.input?.persona).toBe('expert');
    expect(example.input?.topic).toBe('dashboards');
  });

  it('formats conversation transcript correctly', async () => {
    const client = createMockInferenceClient(sampleTurns);
    const config: SimulatorConfig = {
      conversationCount: 1,
      turnsPerConversation: 2,
      topic: 'alerts',
    };

    const dataset = await simulateConversations(NOVICE_PERSONA, client, config);
    const transcript = dataset.examples[0].input?.conversation as string;

    expect(transcript).toContain('User: Hello, how do I search?');
    expect(transcript).toContain('Assistant: You can use the search bar at the top.');
  });

  it('creates a meaningful dataset name and description', async () => {
    const client = createMockInferenceClient(sampleTurns);
    const config: SimulatorConfig = {
      conversationCount: 2,
      turnsPerConversation: 3,
      topic: 'security alerts',
    };

    const dataset = await simulateConversations(ADVERSARIAL_PERSONA, client, config);

    expect(dataset.name).toBe('simulated-adversarial-security-alerts');
    expect(dataset.description).toContain('adversarial');
    expect(dataset.description).toContain('security alerts');
    expect(dataset.description).toContain('2 conversations');
  });

  it('handles empty tool call response gracefully', async () => {
    const client = createEmptyMockClient();
    const config: SimulatorConfig = {
      conversationCount: 1,
      turnsPerConversation: 2,
      topic: 'test',
    };

    const dataset = await simulateConversations(NOVICE_PERSONA, client, config);

    expect(dataset.examples).toHaveLength(1);
    expect(dataset.examples[0].metadata?.turn_count).toBe(0);
  });

  it.each([
    ['novice', NOVICE_PERSONA],
    ['expert', EXPERT_PERSONA],
    ['adversarial', ADVERSARIAL_PERSONA],
  ])('passes %s persona traits to the system prompt', async (_name, persona) => {
    const client = createMockInferenceClient(sampleTurns);
    const config: SimulatorConfig = {
      conversationCount: 1,
      turnsPerConversation: 1,
      topic: 'test topic',
    };

    await simulateConversations(persona, client, config);

    const callArgs = (client.output as jest.Mock).mock.calls[0][0];
    expect(callArgs.system).toContain(persona.name);
    for (const trait of persona.traits) {
      expect(callArgs.system).toContain(trait);
    }
  });

  it('includes conversation turns array in input', async () => {
    const client = createMockInferenceClient(sampleTurns);
    const config: SimulatorConfig = {
      conversationCount: 1,
      turnsPerConversation: 2,
      topic: 'test',
    };

    const dataset = await simulateConversations(NOVICE_PERSONA, client, config);
    const turns = dataset.examples[0].input?.turns as Array<{
      role: string;
      content: string;
    }>;

    expect(turns).toHaveLength(4);
    expect(turns[0].role).toBe('user');
    expect(turns[1].role).toBe('assistant');
  });
});
