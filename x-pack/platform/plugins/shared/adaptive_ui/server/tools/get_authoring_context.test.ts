/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { adaptiveUiTools } from '../../common/constants';
import { getAuthoringContextTool } from './get_authoring_context';

type Handler = ReturnType<typeof getAuthoringContextTool>['handler'];

describe('getAuthoringContextTool', () => {
  it('has the expected id', () => {
    expect(getAuthoringContextTool().id).toBe(adaptiveUiTools.getAuthoringContext);
  });

  it('returns the authoring prose, schema, primitive catalog, and registered views', async () => {
    const tool = getAuthoringContextTool();
    const result = await tool.handler({}, {} as Parameters<Handler>[1]);

    expect('results' in result).toBe(true);
    if (!('results' in result)) {
      return;
    }
    const [first] = result.results;
    expect(first.type).toBe(ToolResultType.other);
    const data = first.data as {
      guide: string;
      rules: string;
      schema: unknown;
      primitives: unknown[];
      views: unknown[];
    };
    expect(data.guide.length).toBeGreaterThan(0);
    expect(data.rules.length).toBeGreaterThan(0);
    expect(data.schema).toBeDefined();
    expect(Array.isArray(data.primitives)).toBe(true);
    expect(data.primitives.length).toBeGreaterThan(0);
    expect(Array.isArray(data.views)).toBe(true);
  });

  // The catalog covers both packs, which a components-only runtime would not.
  it('describes chart primitives alongside components', async () => {
    const tool = getAuthoringContextTool();
    const result = await tool.handler({}, {} as Parameters<Handler>[1]);
    if (!('results' in result)) {
      throw new Error('expected a tool result');
    }
    const { primitives } = result.results[0].data as { primitives: Array<{ type: string }> };
    const types = primitives.map(({ type }) => type);
    expect(types).toContain('callout');
    expect(types).toContain('donut');
  });
});
