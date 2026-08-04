/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { isToolHandlerInterruptReturn } from '@kbn/agent-builder-server/tools';
import { runBrowserToolAdapter } from './browser_tool_adapter';

describe('runBrowserToolAdapter', () => {
  it('returns a stub result for one-way browser tools', () => {
    const [content, artifact] = runBrowserToolAdapter({
      browserTool: {
        id: 'set_title',
        description: 'Set title',
        schema: { type: 'object', properties: {} },
        returns_result: false,
      },
      rawInput: {},
      toolCallId: 'call-1',
    });

    expect(JSON.parse(content).results[0].data.executeOnClient).toBe(true);
    expect(isToolHandlerInterruptReturn(artifact)).toBe(false);
  });

  it('returns a browser_tool_result prompt interrupt for two-way tools', () => {
    const [content, artifact] = runBrowserToolAdapter({
      browserTool: {
        id: 'capture_dashboard_screenshot',
        description: 'Capture',
        schema: { type: 'object', properties: {} },
        returns_result: true,
      },
      rawInput: { settle_ms: 100 },
      toolCallId: 'call-2',
    });

    expect(content).toBe('');
    expect(isToolHandlerInterruptReturn(artifact)).toBe(true);
    expect(artifact).toMatchObject({
      prompt: {
        type: AgentPromptType.browser_tool_result,
        tool_id: 'capture_dashboard_screenshot',
        tool_call_id: 'call-2',
        params: { settle_ms: 100 },
      },
    });
  });
});
