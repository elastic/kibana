/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { InferenceEndpointDefinition } from './inference_endpoint_definition';
import { withConnectorReasoningEffort } from './with_connector_reasoning_effort';

const createClient = () => {
  const bound = {
    chatComplete: jest.fn().mockResolvedValue({ content: 'bound' }),
    prompt: jest.fn().mockResolvedValue({ content: 'bound' }),
    output: jest.fn().mockResolvedValue({ content: 'bound' }),
    bindTo: jest.fn(),
  };
  const client = {
    chatComplete: jest.fn().mockResolvedValue({ content: 'ok' }),
    prompt: jest.fn().mockResolvedValue({ content: 'ok' }),
    output: jest.fn().mockResolvedValue({ content: 'ok' }),
    bindTo: jest.fn().mockReturnValue(bound),
  };
  return { client: client as unknown as BoundInferenceClient, mocks: client, bound };
};

const endpoint = (
  id: string,
  reasoningEffort?: InferenceEndpointDefinition['reasoningEffort']
): InferenceEndpointDefinition => ({
  type: 'inference_endpoint',
  id,
  name: id,
  inferenceId: id,
  provider: 'elastic',
  taskType: 'chat_completion',
  reasoningEffort,
});

const connectors = [endpoint('task', 'high'), endpoint('judge', 'low'), endpoint('plain')];

const messages = [{ role: MessageRole.User as const, content: 'hi' }];
const prompt = { name: 'p', input: {} } as any;

describe('withConnectorReasoningEffort', () => {
  it('asks for the effort on chatComplete when the call sets no reasoning', async () => {
    const { client, mocks } = createClient();

    await withConnectorReasoningEffort(client, 'task', connectors).chatComplete({ messages });

    expect(mocks.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'high' } });
  });

  it('asks for the effort on prompt when the call sets no reasoning', async () => {
    const { client, mocks } = createClient();

    await withConnectorReasoningEffort(client, 'judge', connectors).prompt({ prompt, input: {} });

    expect(mocks.prompt).toHaveBeenCalledWith({ prompt, input: {}, reasoning: { effort: 'low' } });
  });

  it('asks for the effort on output when the call sets no reasoning', async () => {
    const { client, mocks } = createClient();

    await withConnectorReasoningEffort(client, 'task', connectors).output({ id: 'o', input: 'hi' });

    expect(mocks.output).toHaveBeenCalledWith({
      id: 'o',
      input: 'hi',
      reasoning: { effort: 'high' },
    });
  });

  it('overrides an effort the call sets with the connector effort', async () => {
    const { client, mocks } = createClient();

    await withConnectorReasoningEffort(client, 'task', connectors).chatComplete({
      messages,
      reasoning: { effort: 'none' },
    });

    expect(mocks.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'high' } });
  });

  it('keeps other reasoning fields a call sets next to the connector effort', async () => {
    const { client, mocks } = createClient();

    await withConnectorReasoningEffort(client, 'task', connectors).chatComplete({
      messages,
      reasoning: { exclude: true },
    });

    expect(mocks.chatComplete).toHaveBeenCalledWith({
      messages,
      reasoning: { effort: 'high', exclude: true },
    });
  });

  it('passes calls through untouched when the connector declares no effort', async () => {
    const { client, mocks } = createClient();

    await withConnectorReasoningEffort(client, 'plain', connectors).chatComplete({ messages });
    await withConnectorReasoningEffort(client, 'unknown', connectors).chatComplete({
      messages,
      reasoning: { exclude: true },
    });

    expect(mocks.chatComplete).toHaveBeenNthCalledWith(1, { messages });
    expect(mocks.chatComplete).toHaveBeenNthCalledWith(2, {
      messages,
      reasoning: { exclude: true },
    });
  });

  describe('bindTo', () => {
    it('asks for the effort of the connector the client is rebound to', async () => {
      const { client, mocks, bound } = createClient();

      const rebound = withConnectorReasoningEffort(client, 'task', connectors).bindTo({
        connectorId: 'judge',
      });
      await rebound.chatComplete({ messages });
      await rebound.prompt({ prompt, input: {} });
      await rebound.output({ id: 'o', input: 'hi' });

      expect(mocks.bindTo).toHaveBeenCalledWith({ connectorId: 'judge' });
      expect(bound.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'low' } });
      expect(bound.prompt).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: { effort: 'low' } })
      );
      expect(bound.output).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: { effort: 'low' } })
      );
    });

    it('does not carry the default onto a connector that declares no effort', async () => {
      const { client, bound } = createClient();

      const rebound = withConnectorReasoningEffort(client, 'task', connectors).bindTo({
        connectorId: 'plain',
      });
      await rebound.chatComplete({ messages });

      expect(bound.chatComplete).toHaveBeenCalledWith({ messages });
    });

    it('keeps applying efforts on clients rebound more than once', async () => {
      const { client, bound } = createClient();
      const reboundTwice = { chatComplete: jest.fn().mockResolvedValue({ content: 'twice' }) };
      bound.bindTo.mockReturnValue(reboundTwice);

      const rebound = withConnectorReasoningEffort(client, 'task', connectors)
        .bindTo({ connectorId: 'plain' })
        .bindTo({ connectorId: 'judge' });
      await rebound.chatComplete({ messages });

      expect(reboundTwice.chatComplete).toHaveBeenCalledWith({
        messages,
        reasoning: { effort: 'low' },
      });
    });
  });
});
