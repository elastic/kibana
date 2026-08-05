/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import {
  AgentPromptType,
  type BrowserToolCallPrompt as BrowserToolCallPromptRequest,
} from '@kbn/agent-builder-common/agents/prompts';
import { BrowserToolCallPrompt } from './browser_tool_call_prompt';

const prompt: BrowserToolCallPromptRequest = {
  type: AgentPromptType.browser_tool_call,
  id: 'p1',
  tool_id: 'get_time_range',
  params: { verbose: true },
};

const makeTool = (
  handler: (params: { verbose: boolean }) => unknown
): BrowserApiToolDefinition<any> => ({
  id: 'get_time_range',
  description: 'Reads the current time range',
  schema: z.object({ verbose: z.boolean() }),
  handler,
  returnsResult: true,
});

describe('BrowserToolCallPrompt', () => {
  it('runs the handler with the validated params and reports the encoded result', async () => {
    const handler = jest.fn().mockResolvedValue({ from: 'now-15m', to: 'now' });
    const onComplete = jest.fn();

    render(
      <BrowserToolCallPrompt prompt={prompt} tool={makeTool(handler)} onComplete={onComplete} />
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(handler).toHaveBeenCalledWith({ verbose: true });
    expect(onComplete).toHaveBeenCalledWith({ result: '{"from":"now-15m","to":"now"}' });
  });

  it('encodes a handler that returns nothing as null', async () => {
    const onComplete = jest.fn();

    render(
      <BrowserToolCallPrompt
        prompt={prompt}
        tool={makeTool(() => undefined)}
        onComplete={onComplete}
      />
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ result: 'null' }));
  });

  it('reports an error when the tool is not registered on the page', async () => {
    const onComplete = jest.fn();

    render(<BrowserToolCallPrompt prompt={prompt} onComplete={onComplete} />);

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        error: "Browser tool 'get_time_range' is not registered on this page.",
      })
    );
  });

  it('reports an error when the handler throws', async () => {
    const onComplete = jest.fn();
    const tool = makeTool(() => {
      throw new Error('no active tab');
    });

    render(<BrowserToolCallPrompt prompt={prompt} tool={tool} onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ error: 'no active tab' }));
  });

  it('reports an error when the result is not JSON-serializable', async () => {
    const onComplete = jest.fn();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    render(
      <BrowserToolCallPrompt
        prompt={prompt}
        tool={makeTool(() => circular)}
        onComplete={onComplete}
      />
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0]).toHaveProperty('error');
  });

  it('runs the handler once across re-renders', async () => {
    const handler = jest.fn().mockResolvedValue('ok');
    const onComplete = jest.fn();
    const tool = makeTool(handler);

    const { rerender } = render(
      <BrowserToolCallPrompt prompt={prompt} tool={tool} onComplete={onComplete} />
    );
    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    // A fresh inline `onComplete` on every render must not re-trigger the handler.
    rerender(<BrowserToolCallPrompt prompt={prompt} tool={tool} onComplete={() => {}} />);
    rerender(<BrowserToolCallPrompt prompt={prompt} tool={tool} onComplete={() => {}} />);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports an error instead of stalling the round when the handler never settles', async () => {
    jest.useFakeTimers();
    try {
      const onComplete = jest.fn();
      const tool = makeTool(() => new Promise(() => {}));

      render(<BrowserToolCallPrompt prompt={prompt} tool={tool} onComplete={onComplete} />);

      await jest.advanceTimersByTimeAsync(30_000);

      expect(onComplete).toHaveBeenCalledWith({ error: 'Timed out after 30000ms.' });
    } finally {
      jest.useRealTimers();
    }
  });
});
