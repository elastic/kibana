/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GridNode } from '@kbn/isomer';
import {
  MAX_INPUT_VALUES,
  gridExamples,
  metricExamples,
  unsupportedExamples,
  xyChartExamples,
} from '@kbn/isomer';
import type { MarkdownNode } from '@kbn/isomer-components';
import type { MaterializedChartNode } from './nodes';
import { createNodeValidator } from './validate_node';

const validate = createNodeValidator();

const [{ node: metric }] = metricExamples;

describe('createNodeValidator', () => {
  it.each([...metricExamples, ...xyChartExamples, ...gridExamples, ...unsupportedExamples])(
    'accepts the charts pack example "$name"',
    async ({ node }) => {
      expect(await validate(node)).toEqual([]);
    }
  );

  it('reports a charts pack node that breaks its schema, with paths relative to the node', async () => {
    const node: MaterializedChartNode = { ...metric, value: { column: 'missing' } };
    const errors = await validate(node);
    expect(errors).not.toEqual([]);
    expect(errors.map(({ path }) => path)).toContain('value.column');
    expect(errors.every(({ nodeType }) => nodeType === 'metric')).toBe(true);
  });

  it('reports an unsupported node without a title', async () => {
    const [{ node }] = unsupportedExamples;
    expect((await validate({ ...node, title: '' })).map(({ path }) => path)).toEqual(['title']);
  });

  it('validates the nodes inside a grid, with their paths', async () => {
    const [{ node: grid }] = gridExamples;
    const [first, ...rest] = grid.panels;
    const markdown: MarkdownNode = { type: 'markdown', text: 'There are **3** open alerts.' };
    const brokenMetric: MaterializedChartNode = { ...metric, value: { column: 'missing' } };
    const withMarkdown: GridNode = {
      ...grid,
      panels: [{ ...first, node: markdown }, ...rest],
    };
    expect(await validate(withMarkdown)).toEqual([]);

    const withBrokenMetric: GridNode = {
      ...grid,
      panels: [{ ...first, node: brokenMetric }, ...rest],
    };
    expect((await validate(withBrokenMetric)).map(({ path }) => path)).toContain(
      'panels[0].node.value.column'
    );
  });

  it('validates components nodes against the components pack', async () => {
    expect(await validate({ type: 'markdown', text: 'There are **3** open alerts.' })).toEqual([]);
    expect((await validate({ type: 'markdown', text: '' })).map(({ path }) => path)).toEqual([
      'text',
    ]);
  });

  it("refuses a node over the SDK's input budget before its schema runs", async () => {
    const rows = Array.from({ length: MAX_INPUT_VALUES }, (_, index) => [index]);
    const errors = await validate({ ...metric, data: { ...metric.data, rows } });
    expect(errors).toEqual([expect.objectContaining({ code: 'INPUT_OVER_BUDGET' })]);
  });
});
