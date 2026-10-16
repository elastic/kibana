/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BUILTIN_TOOLS } from '@kbn/agent-builder-server/allow_lists';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import {
  createRenderCompositionTool,
  MAX_COMPOSITION_CHARS,
  RENDER_COMPOSITION_TOOL_ID,
} from './render_composition';

const { getRuntime } = isomerPluginMock.createStartContract();
const tool = createRenderCompositionTool({ getRuntime });

const run = async (params: unknown) => {
  const parsed = tool.schema.parse(params);
  const result = await tool.handler(parsed, {} as ToolHandlerContext);
  if (!('results' in result)) {
    throw new Error('expected results');
  }
  const [first] = result.results;
  return first as {
    type: ToolResultType;
    data: { surface?: string; output?: unknown; message?: string };
  };
};

const markdown = { type: 'markdown', text: 'There are **3** open alerts.' };
const composition = { type: 'view', title: 'Alerts', body: [markdown] };

describe('render_composition tool', () => {
  it('is allowlisted', () => {
    expect(AGENT_BUILDER_BUILTIN_TOOLS).toContain(RENDER_COMPOSITION_TOOL_ID);
  });

  it('renders markdown by default', async () => {
    const { type, data } = await run({ composition });
    expect(type).toBe(ToolResultType.other);
    expect(data.surface).toBe('markdown');
    expect(data.output).toContain('There are **3** open alerts.');
  });

  it.each([
    ['text', (output: unknown) => expect(output).toContain('open alerts')],
    [
      'slack',
      (output: unknown) =>
        expect(output).toEqual({ text: expect.any(String), blocks: expect.any(Array) }),
    ],
    ['html', (output: unknown) => expect(output).toContain('<strong>3</strong>')],
  ])('renders %s', async (surface, check) => {
    const { type, data } = await run({ composition, surface });
    expect(type).toBe(ToolResultType.other);
    check(data.output);
  });

  it('returns validation errors with their paths', async () => {
    const { type, data } = await run({
      composition: { type: 'view', body: [markdown, { type: 'nope' }] },
    });
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('body[1].type must be one of: markdown');
  });

  it('refuses a composition past the size limit', async () => {
    const huge = { type: 'markdown', text: 'x'.repeat(MAX_COMPOSITION_CHARS) };
    const { type, data } = await run({ composition: { type: 'view', body: [huge] } });
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain(String(MAX_COMPOSITION_CHARS));
  });
});
