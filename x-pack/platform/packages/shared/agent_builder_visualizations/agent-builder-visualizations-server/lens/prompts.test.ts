/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { createGenerateConfigPrompt } from './prompts';
import type { PresentationMode } from './types';

describe('Lens edit instructions', () => {
  const createPrompt = (presentationMode?: PresentationMode) =>
    JSON.stringify(
      createGenerateConfigPrompt({
        nlQuery: 'Improve this chart',
        esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
        chartType: SupportedChartType.XY,
        schema: {},
        existingConfig: JSON.stringify({ type: 'xy', layers: [] }),
        presentationMode,
        appearanceOnly: true,
      })
    );

  it('defaults to focused edits without reapplying presentation defaults', () => {
    const prompt = createPrompt();

    expect(prompt).toContain('preserve unrelated presentation settings');
    expect(prompt).toContain('Do not reapply design defaults');
    expect(prompt).toContain('Each layer keeps its own existing data_source and column bindings');
    expect(prompt).not.toContain('Bind only result columns from the resolved ES|QL query');
    expect(prompt).not.toContain('Reauthor the presentation:');
  });

  it('delegates comprehensive enhancement without the focused-edit preservation rules', () => {
    const prompt = createPrompt('enhance');

    expect(prompt).toContain('apply ALL applicable chart design defaults');
    expect(prompt).toContain('remove all custom palettes and series color overrides');
    expect(prompt).toContain('remove unsupported threshold coloring');
    expect(prompt).toContain('Before returning, check the resulting');
    expect(prompt).toContain('Each layer keeps its own existing data_source and column bindings');
    expect(prompt).not.toContain('Bind only result columns from the resolved ES|QL query');
    expect(prompt).toContain(
      'keep every layer, its order, column bindings, and displayed measures unchanged'
    );
    expect(prompt).not.toContain('preserve unrelated presentation settings');
    expect(prompt).not.toContain('Do not reapply design defaults');
    expect(prompt).not.toContain('preserve explicit user choices');
  });

  it('supplies the existing configuration and request as human input', () => {
    const existingConfig = JSON.stringify({
      type: 'metric',
      title: 'Protected Assets',
      data_source: {
        type: 'esql',
        query: 'FROM logs-* | STATS hosts = COUNT_DISTINCT(host)',
      },
      metrics: [{ type: 'primary', column: 'hosts', label: 'Protected Assets' }],
    });
    const nlQuery = 'Apply presentation defaults.';
    const [system, human] = createGenerateConfigPrompt({
      nlQuery,
      esqlQuery: 'FROM logs-* | STATS hosts = COUNT_DISTINCT(host)',
      chartType: SupportedChartType.Metric,
      schema: {},
      existingConfig,
      appearanceOnly: true,
      presentationMode: 'enhance',
    });

    expect(system).toEqual(['system', expect.not.stringContaining(existingConfig)]);
    expect(system).toEqual(['system', expect.not.stringContaining(nlQuery)]);
    expect(human).toEqual(['human', expect.stringContaining(existingConfig)]);
    expect(human).toEqual(['human', expect.stringContaining(nlQuery)]);
    expect(human).toEqual(['human', expect.not.stringContaining('Resolved ES|QL query:')]);
  });

  it('gives metric enhancement only the metric title policy', () => {
    const prompt = JSON.stringify(
      createGenerateConfigPrompt({
        nlQuery: 'Apply presentation defaults.',
        esqlQuery: 'FROM logs-* | STATS hosts = COUNT_DISTINCT(host)',
        chartType: SupportedChartType.Metric,
        schema: {},
        existingConfig: JSON.stringify({
          type: 'metric',
          title: 'Distinct Hosts',
          metrics: [{ type: 'primary', column: 'hosts', label: 'Distinct Hosts' }],
        }),
        presentationMode: 'enhance',
        appearanceOnly: true,
      })
    );

    expect(prompt).toContain('Omit the top-level `title` field');
    expect(prompt).not.toContain('Set the top-level `title`');
    expect(prompt).not.toContain('Include a concise panel title');
    expect(prompt).not.toContain('Omit it only for');
  });
});
