/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, KibanaIsomerRuntime } from '@kbn/isomer';
import { CompositionValidationError, unsupportedExamples } from '@kbn/isomer';
import type { MarkdownNode } from '@kbn/isomer-components';
import type { RenderEvent } from './events';
import { instrumentRuntime } from './instrument_runtime';
import { measureInput } from './measure';

const [{ node: unsupported }] = unsupportedExamples;
const materialized: Composition = { type: 'view', body: [unsupported] };
const markdown: MarkdownNode = { type: 'markdown', text: 'Hello' };
const authored: Composition = { type: 'view', body: [markdown] };

const fakeRuntime = () => {
  const surfaces = {
    react: { render: jest.fn() },
    html: { render: jest.fn(() => ({ html: '<p>Vega</p>' })) },
    text: { render: jest.fn(() => 'Vega') },
    markdown: { render: jest.fn(() => '**Vega**') },
    slack: { render: jest.fn(() => ({ text: 'Vega', blocks: [{ type: 'section' }], assets: [] })) },
  };
  return { runtime: { surfaces } as unknown as KibanaIsomerRuntime, surfaces };
};

describe('instrumentRuntime', () => {
  it('reports the size, time and output of each render of a materialized composition', () => {
    const { runtime } = fakeRuntime();
    const report = jest.fn<void, [RenderEvent]>();
    const { surfaces } = instrumentRuntime(runtime, report);

    expect(surfaces.html.render(materialized).html).toBe('<p>Vega</p>');
    surfaces.text.render(materialized);
    surfaces.markdown.render(materialized);
    surfaces.slack.render(materialized);

    const size = measureInput(materialized);
    expect(report.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({ surface: 'html', output_characters: 11, ...size }),
      expect.objectContaining({ surface: 'text', output_characters: 4 }),
      expect.objectContaining({ surface: 'markdown', output_characters: 8 }),
      expect.objectContaining({
        surface: 'slack',
        output_characters: JSON.stringify([{ type: 'section' }]).length,
      }),
    ]);
    expect(report.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        node_count: 1,
        budget_refused: false,
        duration_ms: expect.any(Number),
      })
    );
  });

  it('renders other compositions untouched', () => {
    const { runtime, surfaces: originals } = fakeRuntime();
    const report = jest.fn();
    const { surfaces } = instrumentRuntime(runtime, report);

    surfaces.text.render(authored, { maxWidth: 10 } as never);

    expect(originals.text.render).toHaveBeenCalledWith(authored, { maxWidth: 10 });
    expect(report).not.toHaveBeenCalled();
  });

  it('reports a budget refusal and rethrows it', () => {
    const { runtime, surfaces: originals } = fakeRuntime();
    const refusal = new CompositionValidationError([
      { path: '', message: 'is over the input budget', code: 'INPUT_OVER_BUDGET' },
    ]);
    originals.markdown.render.mockImplementation(() => {
      throw refusal;
    });
    const report = jest.fn<void, [RenderEvent]>();

    expect(() => instrumentRuntime(runtime, report).surfaces.markdown.render(materialized)).toThrow(
      refusal
    );
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'markdown', budget_refused: true, output_characters: 0 })
    );
  });
});
