/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tool } from '@langchain/core/tools';
import { toolDefinitionToInference } from './tools';

const timeRangeSchema = z
  .object({ from: z.string(), to: z.string() })
  .meta({ id: 'test-timeRangeSchema' });

const sharedTool = tool(async () => 'ok', {
  name: 'generate_dashboard',
  description: 'repro',
  schema: z.object({
    operations: z.array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('set_metadata'), time_range: timeRangeSchema.optional() }),
        z.object({ type: z.literal('add_panel') }),
      ])
    ),
  }),
});

const resolve = (root: unknown, ref: string): unknown =>
  ref
    .slice(2)
    .split('/')
    .reduce<unknown>(
      (acc, k) => (acc == null ? undefined : (acc as Record<string, unknown>)[k]),
      root
    );

const collectRefs = (n: unknown, out: string[] = []): string[] => {
  if (n && typeof n === 'object') {
    for (const [k, v] of Object.entries(n as object)) {
      if (k === '$ref' && typeof v === 'string') out.push(v);
      else collectRefs(v, out);
    }
  }
  return out;
};

describe('toolDefinitionToInference preserves $defs', () => {
  it('keeps $defs so nested $refs remain resolvable', () => {
    const defs = toolDefinitionToInference([sharedTool]);
    const schema = defs.generate_dashboard.schema as unknown as Record<string, unknown>;
    const refs = collectRefs(schema);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(resolve(schema, ref)).toBeDefined();
    }
  });
});
