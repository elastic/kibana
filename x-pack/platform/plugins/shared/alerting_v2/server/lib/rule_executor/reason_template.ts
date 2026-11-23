/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowLiquidEngine } from '@kbn/workflows';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { MAX_REASON_TEMPLATE_LENGTH } from '@kbn/alerting-v2-schemas';

type QueryRow = Record<string, unknown>;
type LiquidEngine = ReturnType<typeof createWorkflowLiquidEngine>;
type ParsedTemplate = ReturnType<LiquidEngine['parse']>;

export type ReasonTemplateRule = Pick<RuleResponse, 'id' | 'version' | 'metadata'>;

export interface ReasonRenderer {
  /** Renders the reason for one query row, or `undefined` when there is nothing to store. */
  render: (row: QueryRow) => string | undefined;
}

export interface CreateReasonRendererOptions {
  /** The rule's `reason.template`. */
  template: string | undefined;
  rule: ReasonTemplateRule;
  /** Called at most once per renderer, with the first parse or render error. */
  onError?: (error: unknown) => void;
  /** Total time the renderer may spend rendering, across all rows. */
  renderBudgetMs?: number;
}

const NO_REASON: ReasonRenderer = { render: () => undefined };

// UTF-16 stores characters outside 16 bits (emojis) as two code units. The first one, the high
// surrogate, falls in this range.
const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;

// Keys that must never become part of the `data` object. Assigning `__proto__` would replace the
// prototype of the object instead of creating a key.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Rendering is synchronous and runs on the event loop, and templates are written by users, so every
// render is bounded. A typical template renders in about 10 microseconds per row.
const RENDER_LIMIT_MS = 50;
const RENDER_MEMORY_LIMIT = 1_000_000;
const DEFAULT_RENDER_BUDGET_MS = 1_000;

let engine: LiquidEngine | undefined;

const getEngine = (): LiquidEngine => {
  engine ??= createWorkflowLiquidEngine({
    strictFilters: true,
    strictVariables: false,
    renderLimit: RENDER_LIMIT_MS,
    memoryLimit: RENDER_MEMORY_LIMIT,
  });
  return engine;
};

/**
 * Writes `value` at the nested `path` of `data`, creating intermediate objects. It only descends
 * into objects created here, so a flat value (`a` next to `a.b`) is never overwritten or mutated.
 */
const setNested = (
  data: Record<string, unknown>,
  created: WeakSet<object>,
  path: string[],
  value: unknown
): void => {
  let node = data;
  for (const segment of path.slice(0, -1)) {
    if (!Object.hasOwn(node, segment)) {
      const child: Record<string, unknown> = {};
      created.add(child);
      node[segment] = child;
    }
    const next = node[segment];
    if (typeof next !== 'object' || next === null || !created.has(next)) {
      return;
    }
    node = next as Record<string, unknown>;
  }

  const leaf = path[path.length - 1];
  if (!Object.hasOwn(node, leaf)) {
    node[leaf] = value;
  }
};

/**
 * Builds the `data` namespace from a flat ES|QL row. Every column stays reachable by its flat name
 * (`data["host.name"]`), and dotted columns are also nested so `data.host.name` works.
 */
export const buildDataContext = (row: QueryRow): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  const created = new WeakSet<object>();

  for (const [key, value] of Object.entries(row)) {
    if (!UNSAFE_KEYS.has(key)) {
      data[key] = value;
    }
  }

  for (const [key, value] of Object.entries(row)) {
    const path = key.split('.');
    if (path.length > 1 && !path.some((segment) => segment === '' || UNSAFE_KEYS.has(segment))) {
      setNested(data, created, path, value);
    }
  }

  return data;
};

const buildRuleContext = (rule: ReasonTemplateRule): Record<string, unknown> => ({
  id: rule.id,
  name: rule.metadata.name,
  description: rule.metadata.description ?? '',
  tags: rule.metadata.tags ?? [],
  version: rule.version,
});

/** Cuts the text to the stored limit without leaving half of a surrogate pair at the end. */
const truncate = (text: string): string => {
  if (text.length <= MAX_REASON_TEMPLATE_LENGTH) {
    return text;
  }
  const cut = text.slice(0, MAX_REASON_TEMPLATE_LENGTH);
  const lastCode = cut.charCodeAt(cut.length - 1);
  return lastCode >= HIGH_SURROGATE_MIN && lastCode <= HIGH_SURROGATE_MAX ? cut.slice(0, -1) : cut;
};

/**
 * Parses the reason template once and returns a renderer to call for each query row. The context
 * has two namespaces: `data` (the row, so `{{ data.host.name }}`) and `rule` (`id`, `name`,
 * `description`, `tags`, `version`). A missing, `null` or unknown variable renders as an empty string.
 *
 * It never throws: a template that fails to parse or render, or that renders to nothing, yields
 * `undefined`, so the event is written without a reason. Because rendering blocks the event loop,
 * each render is time and memory limited, and the renderer stops (returning `undefined` for the
 * remaining rows) after the first failure or once `renderBudgetMs` is spent.
 */
export const createReasonRenderer = ({
  template,
  rule,
  onError,
  renderBudgetMs = DEFAULT_RENDER_BUDGET_MS,
}: CreateReasonRendererOptions): ReasonRenderer => {
  if (template === undefined) {
    return NO_REASON;
  }

  let reported = false;
  const report = (error: unknown) => {
    if (!reported) {
      reported = true;
      onError?.(error);
    }
  };

  let parsed: ParsedTemplate;
  try {
    parsed = getEngine().parse(template);
  } catch (error) {
    report(error);
    return NO_REASON;
  }

  const ruleContext = buildRuleContext(rule);
  let stopped = false;
  let spentMs = 0;

  return {
    render: (row) => {
      if (stopped) {
        return undefined;
      }

      const startedAt = performance.now();
      try {
        const text = getEngine().renderSync(parsed, {
          data: buildDataContext(row),
          rule: ruleContext,
        });
        const reason = truncate(String(text));
        return reason.trim() === '' ? undefined : reason;
      } catch (error) {
        stopped = true;
        report(error);
        return undefined;
      } finally {
        spentMs += performance.now() - startedAt;
        if (!stopped && spentMs >= renderBudgetMs) {
          stopped = true;
          report(new Error('Reason rendering time budget exceeded'));
        }
      }
    },
  };
};
