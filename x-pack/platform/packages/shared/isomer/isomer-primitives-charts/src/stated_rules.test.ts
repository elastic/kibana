/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every custom check in the pack states its rule in a description the agent-facing JSON Schema keeps.

import {
  authoringSchemaSubset,
  buildAuthoringJsonSchema,
  unresolvedBodyNodeSchema,
  z,
} from '@elastic/isomer-sdk';

import { crossSuperRefine, rulesOf } from './model/cross_field';
import { chartsPack } from './pack';

const { primitives } = chartsPack;

interface ZodInternals {
  _zod: {
    def: Record<string, unknown> & {
      checks?: unknown[];
      getter?: () => unknown;
    };
  };
}

const isZod = (value: unknown): value is ZodInternals =>
  typeof value === 'object' && value !== null && '_zod' in value;

/** Each primitive's schema with its child slots unresolved, so the walk stops at nested primitives. */
const members = new Map(
  primitives.map(({ type, schema, schemaFor }) => [
    type,
    schemaFor ? schemaFor(unresolvedBodyNodeSchema) : schema,
  ])
);
const memberSchemas = new Set<unknown>(members.values());

/** Every custom check reachable from `root`, stopping at other primitives, which are checked on their own. */
const customChecks = (root: ZodInternals): object[] => {
  const found: object[] = [];
  const seen = new Set<unknown>();
  const queue: unknown[] = [root];
  while (queue.length > 0) {
    const schema = queue.pop();
    if (!isZod(schema) || seen.has(schema) || (schema !== root && memberSchemas.has(schema))) {
      continue;
    }
    seen.add(schema);
    const { def } = schema._zod;
    for (const check of def.checks ?? []) {
      if (isZod(check) && check._zod.def.check === 'custom') {
        found.push(check);
      }
    }
    if (typeof def.getter === 'function') {
      queue.push(def.getter());
    }
    for (const value of Object.values(def)) {
      if (Array.isArray(value)) {
        queue.push(...(value as unknown[]));
      } else if (isZod(value)) {
        queue.push(value);
      } else if (typeof value === 'object' && value !== null) {
        queue.push(...(Object.values(value) as unknown[]));
      }
    }
  }
  return found;
};

const descriptions = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(descriptions);
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, entry]) =>
    key === 'description' && typeof entry === 'string' ? [entry] : descriptions(entry)
  );
};

const authoring = buildAuthoringJsonSchema(primitives);

const rows = [...members].map(([type, schema]) => ({
  type,
  checks: customChecks(schema as unknown as ZodInternals),
}));

describe('stated rules', () => {
  it('finds the checks it guards', () => {
    expect(Object.fromEntries(rows.map(({ type, checks }) => [type, checks.length]))).toEqual({
      donut: 8,
      gauge: 11,
      heatmap: 21,
      metricTrend: 12,
      treemap: 6,
      xyChart: 28,
    });
  });

  it.each(rows)('$type states each custom check in its authoring schema', ({ type, checks }) => {
    const stated = descriptions(authoringSchemaSubset(authoring, [type]));
    for (const check of checks) {
      const rules = rulesOf(check);
      expect({ type, madeWithCrossField: rules !== undefined }).toEqual({
        type,
        madeWithCrossField: true,
      });
      for (const rule of rules ?? []) {
        expect({
          type,
          rule,
          stated: stated.some((description) => description.includes(rule)),
        }).toEqual({ type, rule, stated: true });
      }
    }
  });
});

describe('crossSuperRefine', () => {
  const fields = z.object({ a: z.string(), b: z.number() });

  it('is a custom check the walk finds, with its rules, that runs after a field fails', () => {
    const schema = fields.check(
      crossSuperRefine<z.infer<typeof fields>>(
        ({ a }, context) => {
          if (a === 'x') {
            context.addIssue({ code: 'custom', message: 'no x', path: ['a'] });
          }
        },
        ['`a` is never x']
      )
    );
    const [check] = customChecks(schema as unknown as ZodInternals);
    expect(check && rulesOf(check)).toEqual(['`a` is never x']);
    const { error } = schema.safeParse({ a: 'x', b: 'one' });
    expect(error?.issues.map(({ message }) => message)).toContain('no x');
  });

  it('leaves a bare `superRefine` for the walk to refuse', () => {
    const [check] = customChecks(fields.superRefine(() => undefined) as unknown as ZodInternals);
    expect(check).toBeDefined();
    expect(check && rulesOf(check)).toBeUndefined();
  });
});
