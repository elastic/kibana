/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { BrowserToolsService } from './browser_tools_service';

const makeTool = (id: string): BrowserApiToolDefinition<{ value: string }> => ({
  id,
  description: `Tool ${id}`,
  schema: z.object({ value: z.string() }),
  handler: () => undefined,
});

describe('BrowserToolsService', () => {
  it('returns registered tools', () => {
    const service = new BrowserToolsService();
    const toolA = makeTool('tool_a');
    const toolB = makeTool('tool_b');

    service.register(toolA);
    service.register(toolB);

    expect(service.getBrowserTools()).toEqual([toolA, toolB]);
  });

  it('returns an empty list when nothing is registered', () => {
    const service = new BrowserToolsService();
    expect(service.getBrowserTools()).toEqual([]);
  });

  it('throws when registering a duplicate tool id', () => {
    const service = new BrowserToolsService();
    service.register(makeTool('tool_a'));

    expect(() => service.register(makeTool('tool_a'))).toThrow(
      'Browser tool "tool_a" is already registered.'
    );
  });
});
