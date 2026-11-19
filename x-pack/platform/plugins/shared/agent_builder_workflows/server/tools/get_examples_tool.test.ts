/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { WORKFLOW_EXAMPLES } from '@kbn/workflows';
import { registerGetExamplesTool } from './get_examples_tool';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(() => Promise.resolve('name: Test Workflow\nenabled: true')),
}));

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetExamplesTool', () => {
  let registeredTool: BuiltinToolDefinition;

  beforeEach(() => {
    jest.clearAllMocks();
    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetExamplesTool(agentBuilder);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_examples');
  });

  it('returns examples without filter', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(data.count).toBeLessThanOrEqual(3);
    expect(data.totalAvailable).toBe(WORKFLOW_EXAMPLES.length);
  });

  it('respects default limit of 3', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    const data = result.results[0].data as any;
    expect(data.count).toBeLessThanOrEqual(3);
  });

  it('respects custom limit capped at 5', async () => {
    const result = await invokeHandler(registeredTool, { limit: 10 }, {});
    const data = result.results[0].data as any;
    expect(data.count).toBeLessThanOrEqual(5);
  });

  it('filters by category', async () => {
    const result = await invokeHandler(registeredTool, { category: 'security' }, {});
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    const securityExamples = WORKFLOW_EXAMPLES.filter((e) => e.category === 'security');
    expect(data.totalAvailable).toBe(securityExamples.length);
  });

  it('filters by search term', async () => {
    const result = await invokeHandler(registeredTool, { search: 'alert' }, {});
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
  });

  it('includes YAML content in results', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    const data = result.results[0].data as any;
    expect(data.examples[0]).toHaveProperty('yaml');
    expect(data.examples[0].yaml).toContain('Test Workflow');
  });

  it('returns results in expected shape', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    const data = result.results[0].data as any;
    for (const example of data.examples) {
      expect(example).toHaveProperty('id');
      expect(example).toHaveProperty('name');
      expect(example).toHaveProperty('category');
    }
  });
});
