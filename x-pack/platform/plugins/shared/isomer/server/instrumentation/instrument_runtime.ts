/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, KibanaIsomerRuntime } from '@kbn/isomer';
import type { RenderEvent } from './events';
import { measureInput } from './measure';

/** Node types only materialization produces, so a composition holding one was materialized. */
const MATERIALIZED_NODE_TYPES: ReadonlySet<string> = new Set([
  'metric',
  'xyChart',
  'grid',
  'unsupported',
]);

const INPUT_OVER_BUDGET = 'INPUT_OVER_BUDGET';

const holdsMaterializedNodes = ({ body }: Composition): boolean =>
  Array.isArray(body) && body.some((node) => MATERIALIZED_NODE_TYPES.has(node?.type));

const isBudgetRefusal = (error: unknown): boolean =>
  error instanceof Error &&
  'errors' in error &&
  Array.isArray(error.errors) &&
  error.errors.some((finding: { code?: string }) => finding?.code === INPUT_OVER_BUDGET);

/**
 * Wraps a render so each one of a composition holding materialized nodes reports its input
 * size, time and output size. Other compositions render untouched.
 */
const instrument = <TOptions, TResult>(
  surface: string,
  render: (composition: Composition, options?: TOptions) => TResult,
  outputCharacters: (result: TResult) => number,
  report: (event: RenderEvent) => void
) => {
  return (composition: Composition, options?: TOptions): TResult => {
    if (!holdsMaterializedNodes(composition)) {
      return render(composition, options);
    }
    const started = performance.now();
    const { values, characters } = measureInput(composition);
    const base = { surface, node_count: composition.body.length, values, characters };
    try {
      const result = render(composition, options);
      report({
        ...base,
        duration_ms: Math.round(performance.now() - started),
        output_characters: outputCharacters(result),
        budget_refused: false,
      });
      return result;
    } catch (error) {
      report({
        ...base,
        duration_ms: Math.round(performance.now() - started),
        output_characters: 0,
        budget_refused: isBudgetRefusal(error),
      });
      throw error;
    }
  };
};

/** The runtime with its HTML, text, Markdown and Slack renders instrumented. */
export const instrumentRuntime = (
  runtime: KibanaIsomerRuntime,
  report: (event: RenderEvent) => void
): KibanaIsomerRuntime => {
  const { html, text, markdown, slack } = runtime.surfaces;
  return {
    ...runtime,
    surfaces: {
      ...runtime.surfaces,
      html: {
        ...html,
        render: instrument('html', html.render, (result) => result.html.length, report),
      },
      text: { ...text, render: instrument('text', text.render, (result) => result.length, report) },
      markdown: {
        ...markdown,
        render: instrument('markdown', markdown.render, (result) => result.length, report),
      },
      slack: {
        ...slack,
        render: instrument(
          'slack',
          slack.render,
          (result) => JSON.stringify(result.blocks).length,
          report
        ),
      },
    },
  };
};
