/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { withDefaultReasoning } from './with_default_reasoning';

const createClient = () => {
  const bound = {
    chatComplete: jest.fn().mockResolvedValue({ content: 'bound' }),
    prompt: jest.fn().mockResolvedValue({ content: 'bound' }),
    bindTo: jest.fn(),
  };
  const client = {
    chatComplete: jest.fn().mockResolvedValue({ content: 'ok' }),
    prompt: jest.fn().mockResolvedValue({ content: 'ok' }),
    bindTo: jest.fn().mockReturnValue(bound),
  };
  return { client: client as unknown as BoundInferenceClient, mocks: client, bound };
};

const messages = [{ role: MessageRole.User as const, content: 'hi' }];

describe('withDefaultReasoning', () => {
  it('asks for the effort on chatComplete when the call sets no reasoning', async () => {
    const { client, mocks } = createClient();

    await withDefaultReasoning(client, 'high').chatComplete({ messages });

    expect(mocks.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'high' } });
  });

  it('asks for the effort on prompt when the call sets no reasoning', async () => {
    const { client, mocks } = createClient();
    const prompt = { name: 'p', input: {} } as any;

    await withDefaultReasoning(client, 'low').prompt({ prompt, input: {} });

    expect(mocks.prompt).toHaveBeenCalledWith({ prompt, input: {}, reasoning: { effort: 'low' } });
  });

  it('lets an explicit reasoning on the call win over the default', async () => {
    const { client, mocks } = createClient();

    await withDefaultReasoning(client, 'high').chatComplete({
      messages,
      reasoning: { effort: 'none' },
    });

    expect(mocks.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'none' } });
  });

  it('keeps other reasoning fields a call sets next to the default effort', async () => {
    const { client, mocks } = createClient();

    await withDefaultReasoning(client, 'high').chatComplete({
      messages,
      reasoning: { exclude: true },
    });

    expect(mocks.chatComplete).toHaveBeenCalledWith({
      messages,
      reasoning: { effort: 'high', exclude: true },
    });
  });

  it('passes calls through untouched when no effort is set', async () => {
    const { client, mocks } = createClient();

    await withDefaultReasoning(client, undefined).chatComplete({ messages });

    expect(mocks.chatComplete).toHaveBeenCalledWith({ messages, reasoning: undefined });
  });

  it('does not carry the default onto a client rebound to a connector with no effort', async () => {
    const { client, mocks, bound } = createClient();

    const rebound = withDefaultReasoning(client, 'high').bindTo({ connectorId: 'judge' });
    await rebound.chatComplete({ messages });

    expect(mocks.bindTo).toHaveBeenCalledWith({ connectorId: 'judge' });
    expect(bound.chatComplete).toHaveBeenCalledWith({ messages });
  });

  it('applies the rebound connector own effort when the resolver knows it', async () => {
    const { client, bound } = createClient();
    const resolveEffort = (connectorId: string) =>
      connectorId === 'judge' ? ('low' as const) : undefined;

    const rebound = withDefaultReasoning(client, 'high', resolveEffort).bindTo({
      connectorId: 'judge',
    });
    await rebound.chatComplete({ messages });
    await rebound.prompt({ prompt: { name: 'p', input: {} } as any, input: {} });

    expect(bound.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'low' } });
    expect(bound.prompt).toHaveBeenCalledWith(
      expect.objectContaining({ reasoning: { effort: 'low' } })
    );
  });

  it('resolves the judge effort even when the task connector has none', async () => {
    const { client, bound } = createClient();

    const rebound = withDefaultReasoning(client, undefined, () => 'medium').bindTo({
      connectorId: 'judge',
    });
    await rebound.chatComplete({ messages });

    expect(bound.chatComplete).toHaveBeenCalledWith({ messages, reasoning: { effort: 'medium' } });
  });
});
