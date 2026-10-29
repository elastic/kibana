/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LaunchedExperimentConfig } from '../../../common/experiments/run_experiment';
import { LaunchedConfigSummary } from '.';

const buildConfig = (
  overrides: Partial<LaunchedExperimentConfig> = {}
): LaunchedExperimentConfig => ({
  target_label: 'Agent Builder agent (converse)',
  connector_names: ['Google Gemini 3.5 Flash-Lite'],
  dataset_names: ['Hello'],
  evaluator_names: ['groundedness', 'correctness', 'latency'],
  repetitions: 1,
  concurrency: 5,
  ...overrides,
});

/** Reads the description rendered next to a term in the summary list. */
const descriptionFor = (term: string) =>
  screen.getByText(term).nextElementSibling?.textContent ?? null;

describe('LaunchedConfigSummary', () => {
  it('reports one judge connector when every llm evaluator shares it', () => {
    render(
      <LaunchedConfigSummary
        config={buildConfig({
          evaluator_judges: [
            { evaluator_name: 'groundedness', judge_label: 'Google Gemini 3.5 Flash-Lite' },
            { evaluator_name: 'correctness', judge_label: 'Google Gemini 3.5 Flash-Lite' },
          ],
        })}
      />
    );

    expect(descriptionFor('Judge connector')).toBe('Google Gemini 3.5 Flash-Lite');
    expect(screen.queryByText('Judge connectors')).not.toBeInTheDocument();
  });

  it('names the evaluator alongside each judge once the judges differ', () => {
    render(
      <LaunchedConfigSummary
        config={buildConfig({
          evaluator_judges: [
            { evaluator_name: 'groundedness', judge_label: 'Google Gemini 3.5 Flash-Lite' },
            { evaluator_name: 'correctness', judge_label: 'GPT-4o' },
          ],
        })}
      />
    );

    expect(descriptionFor('Judge connectors')).toBe(
      'groundedness: Google Gemini 3.5 Flash-Lite, correctness: GPT-4o'
    );
    expect(screen.queryByText('Judge connector')).not.toBeInTheDocument();
  });

  it('omits the judge row for an all-code evaluator selection', () => {
    render(
      <LaunchedConfigSummary
        config={buildConfig({ evaluator_names: ['latency'], evaluator_judges: [] })}
      />
    );

    expect(screen.getByText('Evaluators')).toBeInTheDocument();
    expect(screen.queryByText('Judge connector')).not.toBeInTheDocument();
    expect(screen.queryByText('Judge connectors')).not.toBeInTheDocument();
  });

  it('omits the judge row for state captured before judges were summarized', () => {
    render(<LaunchedConfigSummary config={buildConfig()} />);

    expect(descriptionFor('Evaluators')).toBe('groundedness, correctness, latency');
    expect(screen.queryByText('Judge connector')).not.toBeInTheDocument();
  });
});
