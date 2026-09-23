/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { createGenerateConfigPrompt } from './prompts';

describe('Lens config prompt', () => {
  const createPrompt = (applyChartRules?: boolean) =>
    JSON.stringify(
      createGenerateConfigPrompt({
        nlQuery: 'Improve this chart',
        esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
        chartType: SupportedChartType.XY,
        schema: {},
        existingConfig: JSON.stringify({ type: 'xy', layers: [] }),
        applyChartRules,
        preserveESQL: true,
      })
    );

  it('defaults to focused edits that preserve unrelated presentation', () => {
    const prompt = createPrompt();

    expect(prompt).toContain('preserve unrelated presentation settings');
    expect(prompt).toContain(
      'This is an appearance-only edit. Each layer keeps its existing data_source'
    );
    expect(prompt).not.toContain('Bind only result columns from the resolved ES|QL query');
    expect(prompt).not.toContain('Reauthor the presentation.');
  });

  it('switches enhancement to reauthoring without the preservation rule', () => {
    const prompt = createPrompt(true);

    expect(prompt).toContain('Reauthor the presentation. Apply every applicable chart rule');
    expect(prompt).toContain('Existing display text is not a naming instruction');
    expect(prompt).toContain(
      'This is an appearance-only edit. Each layer keeps its existing data_source'
    );
    expect(prompt).not.toContain('preserve unrelated presentation settings');
  });

  it('omits edit rules and keeps the resolved query for a new chart', () => {
    const [system, human] = createGenerateConfigPrompt({
      nlQuery: 'count of logs',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
      chartType: SupportedChartType.Metric,
      schema: {},
    });

    expect(system).toEqual(['system', expect.not.stringContaining('EDIT RULES')]);
    expect(system).toEqual(['system', expect.stringContaining('Bind only result columns')]);
    expect(human).toEqual(['human', expect.stringContaining('Resolved ES|QL query:')]);
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
      preserveESQL: true,
      applyChartRules: true,
    });

    expect(system).toEqual(['system', expect.not.stringContaining(existingConfig)]);
    expect(system).toEqual(['system', expect.not.stringContaining(nlQuery)]);
    expect(human).toEqual(['human', expect.stringContaining(existingConfig)]);
    expect(human).toEqual(['human', expect.stringContaining(nlQuery)]);
    expect(human).toEqual(['human', expect.not.stringContaining('Resolved ES|QL query:')]);
  });

  it.each([
    [SupportedChartType.Metric, 'Omit the top-level `title`', 'Set the top-level `title`'],
    [SupportedChartType.Pie, 'Set the top-level `title`', 'Omit the top-level `title`'],
  ])('gives %s only its own title policy', (chartType, expected, unexpected) => {
    const [system] = createGenerateConfigPrompt({
      nlQuery: 'Apply presentation defaults.',
      esqlQuery: 'FROM logs-* | STATS hosts = COUNT_DISTINCT(host)',
      chartType,
      schema: {},
    });

    expect(system).toEqual(['system', expect.stringContaining(expected)]);
    expect(system).toEqual(['system', expect.not.stringContaining(unexpected)]);
  });

  it('gives a pie no color mechanics or threshold guidance', () => {
    const [system] = createGenerateConfigPrompt({
      nlQuery: 'traffic by browser',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY browser',
      chartType: SupportedChartType.Pie,
      schema: {},
    });

    expect(system).toEqual(['system', expect.stringContaining('default palette')]);
    expect(system).toEqual(['system', expect.not.stringContaining('COLOR MECHANICS')]);
    expect(system).toEqual(['system', expect.not.stringContaining('threshold')]);
    expect(system).toEqual(['system', expect.not.stringContaining('COLOR GUIDANCE')]);
  });
});
