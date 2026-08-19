/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { wrapInferenceClientWithReasoningDefault } from './wrap_inference_client_with_reasoning_default';

const EIS_CONNECTOR_ID = 'eis-google-gemini-3-6-flash';
const NON_EIS_CONNECTOR_ID = 'openai-gpt-5-6-luna';

interface MockClient extends BoundInferenceClient {
  chatComplete: jest.Mock;
  prompt: jest.Mock;
  bindTo: jest.Mock;
}

const createMockClient = (): MockClient => {
  const client = {
    chatComplete: jest.fn(),
    prompt: jest.fn(),
    bindTo: jest.fn(),
  } as unknown as MockClient;

  client.bindTo.mockImplementation(() => createMockClient());

  return client;
};

describe('wrapInferenceClientWithReasoningDefault', () => {
  it('injects the default reasoning on chatComplete for an EIS connector when the caller set none', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, EIS_CONNECTOR_ID);

    wrapped.chatComplete({ messages: [] } as any);

    expect(client.chatComplete).toHaveBeenCalledWith({
      messages: [],
      reasoning: { enabled: true },
    });
  });

  it('injects the default reasoning on prompt for an EIS connector when the caller set none', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, EIS_CONNECTOR_ID);

    wrapped.prompt({ prompt: { name: 'p' }, input: {} } as any);

    expect(client.prompt).toHaveBeenCalledWith({
      prompt: { name: 'p' },
      input: {},
      reasoning: { enabled: true },
    });
  });

  it('does not inject reasoning for a non-EIS connector', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, NON_EIS_CONNECTOR_ID);

    wrapped.chatComplete({ messages: [] } as any);
    wrapped.prompt({ prompt: { name: 'p' }, input: {} } as any);

    expect(client.chatComplete).toHaveBeenCalledWith({ messages: [] });
    expect(client.prompt).toHaveBeenCalledWith({ prompt: { name: 'p' }, input: {} });
  });

  it('preserves an explicit reasoning on chatComplete', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, EIS_CONNECTOR_ID);

    wrapped.chatComplete({ messages: [], reasoning: { effort: 'high' } } as any);

    expect(client.chatComplete).toHaveBeenCalledWith({
      messages: [],
      reasoning: { effort: 'high' },
    });
  });

  it('preserves an explicit reasoning on prompt', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, EIS_CONNECTOR_ID);

    wrapped.prompt({ prompt: { name: 'p' }, input: {}, reasoning: { effort: 'low' } } as any);

    expect(client.prompt).toHaveBeenCalledWith({
      prompt: { name: 'p' },
      input: {},
      reasoning: { effort: 'low' },
    });
  });

  it('honors a custom default reasoning value', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, EIS_CONNECTOR_ID, {
      effort: 'medium',
    });

    wrapped.chatComplete({ messages: [] } as any);

    expect(client.chatComplete).toHaveBeenCalledWith({
      messages: [],
      reasoning: { effort: 'medium' },
    });
  });

  it('re-evaluates the connector across bindTo (injects when rebinding to an EIS connector)', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, NON_EIS_CONNECTOR_ID);

    const rebound = wrapped.bindTo({ connectorId: EIS_CONNECTOR_ID });
    rebound.chatComplete({ messages: [] } as any);

    const reboundInner = client.bindTo.mock.results[0].value as MockClient;
    expect(reboundInner.chatComplete).toHaveBeenCalledWith({
      messages: [],
      reasoning: { enabled: true },
    });
  });

  it('re-evaluates the connector across bindTo (no injection when rebinding to a non-EIS connector)', () => {
    const client = createMockClient();
    const wrapped = wrapInferenceClientWithReasoningDefault(client, EIS_CONNECTOR_ID);

    const rebound = wrapped.bindTo({ connectorId: NON_EIS_CONNECTOR_ID });
    rebound.chatComplete({ messages: [] } as any);

    const reboundInner = client.bindTo.mock.results[0].value as MockClient;
    expect(reboundInner.chatComplete).toHaveBeenCalledWith({ messages: [] });
  });
});
