/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EvaluationExperimentDatasetExample } from '@kbn/evals-common';
import { ExampleScoresTable, getVerdictBadgeColor } from '.';

const buildScore = ({
  timestamp,
  traceId,
  evaluatorName,
  evaluatorScore,
  evaluatorLabel,
  evaluatorExplanation,
  evaluatorMetadata,
  evaluatorTraceId,
  evaluatorModelId = 'evaluator-model-1',
  repetitionIndex,
  exampleInput,
  taskOutput,
}: {
  timestamp: string;
  traceId?: string | null;
  evaluatorName: string;
  evaluatorScore?: number | null;
  evaluatorLabel?: string | null;
  evaluatorExplanation?: string | null;
  evaluatorMetadata?: Record<string, unknown> | null;
  evaluatorTraceId?: string | null;
  evaluatorModelId?: string;
  repetitionIndex: number;
  exampleInput?: Record<string, unknown> | null;
  taskOutput?: Record<string, unknown> | null;
}): EvaluationExperimentDatasetExample['scores'][number] => ({
  '@timestamp': timestamp,
  experiment_id: 'experiment-1',
  example: {
    id: 'example-1',
    index: 2,
    input: exampleInput ?? null,
    dataset: {
      id: 'dataset-1',
      name: 'dataset name',
    },
  },
  task: {
    trace_id: traceId,
    repetition_index: repetitionIndex,
    output: taskOutput ?? null,
    model: {
      id: 'task-model-1',
    },
  },
  evaluator: {
    name: evaluatorName,
    score: evaluatorScore,
    label: evaluatorLabel,
    explanation: evaluatorExplanation,
    metadata: evaluatorMetadata,
    trace_id: evaluatorTraceId,
    model: {
      id: evaluatorModelId,
    },
  },
  metadata: {
    total_repetitions: 1,
  },
});

const buildMixedJudgeExample = (): EvaluationExperimentDatasetExample => ({
  example_id: 'example-mixed-judges',
  example_index: 0,
  scores: [
    buildScore({
      timestamp: '2026-03-02T12:00:00.000Z',
      evaluatorName: 'correctness.factuality',
      evaluatorScore: 0.71,
      evaluatorModelId: 'openai-gpt-5.6-luna',
      repetitionIndex: 0,
    }),
    buildScore({
      timestamp: '2026-03-02T12:00:00.000Z',
      evaluatorName: 'correctness.relevance',
      evaluatorScore: 0.5,
      evaluatorModelId: 'openai-gpt-5.6-luna',
      repetitionIndex: 0,
    }),
    buildScore({
      timestamp: '2026-03-02T12:00:00.000Z',
      evaluatorName: 'groundedness',
      evaluatorScore: 1,
      evaluatorModelId: 'google-gemini-3.5-flash',
      repetitionIndex: 0,
    }),
  ],
});

describe('ExampleScoresTable', () => {
  it('renders repetition navigation and inline JSON previews for multi-repetition rows', () => {
    const onTraceClick = jest.fn();
    const examples: EvaluationExperimentDatasetExample[] = [
      {
        example_id: 'example-id-0000000000000001',
        example_index: 2,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            traceId: '6d8639157ac4141c0000000000000001',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.95,
            repetitionIndex: 0,
            exampleInput: { prompt: 'input-r1' },
            taskOutput: { completion: 'output-r1' },
          }),
          buildScore({
            timestamp: '2026-03-02T12:00:02.000Z',
            traceId: '6d8639157ac4141c0000000000000002',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.1,
            repetitionIndex: 1,
            exampleInput: { prompt: 'input-r2' },
            taskOutput: { completion: 'output-r2' },
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={onTraceClick} />);

    expect(screen.getByText('example-id-0000000000000001')).toBeInTheDocument();

    const pagination = screen.getByRole('navigation', {
      name: 'Select repetition for example example-id-0000000000000001',
    });
    expect(pagination).toBeInTheDocument();

    expect(screen.getByText(/"prompt": "input-r1"/)).toBeInTheDocument();
    expect(screen.getByText(/"completion": "output-r1"/)).toBeInTheDocument();
    expect(screen.getByText('Criteria:')).toBeInTheDocument();
    expect(screen.getByText('0.95')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000001',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith(
      '6d8639157ac4141c0000000000000001',
      'example-id-0000000000000001'
    );

    const nextPageButton = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextPageButton);
    expect(screen.getByText('0.10')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000002',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith(
      '6d8639157ac4141c0000000000000002',
      'example-id-0000000000000001'
    );
  });

  it('does not render repetition pagination for single-repetition rows', () => {
    const examples: EvaluationExperimentDatasetExample[] = [
      {
        example_id: 'example-id-single-repetition',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            traceId: '6d8639157ac4141c0000000000000100',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.5,
            repetitionIndex: 0,
            exampleInput: { prompt: 'single-input' },
            taskOutput: { completion: 'single-output' },
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(
      screen.queryByRole('navigation', {
        name: 'Select repetition for example example-id-single-repetition',
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText('example-id-single-repetition')).toBeInTheDocument();
  });

  describe('multi-score evaluators', () => {
    it('groups sub-scores under the evaluator name instead of repeating it on each row', () => {
      render(<ExampleScoresTable examples={[buildMixedJudgeExample()]} onTraceClick={jest.fn()} />);

      expect(screen.getByText('correctness')).toBeInTheDocument();
      expect(screen.getByText('factuality:')).toBeInTheDocument();
      expect(screen.getByText('relevance:')).toBeInTheDocument();
      expect(screen.queryByText('correctness.factuality:')).not.toBeInTheDocument();
    });

    it('keeps a single-score evaluator on one row without a heading', () => {
      render(<ExampleScoresTable examples={[buildMixedJudgeExample()]} onTraceClick={jest.fn()} />);

      expect(screen.getAllByText('groundedness:')).toHaveLength(1);
      expect(screen.queryByText('groundedness')).not.toBeInTheDocument();
    });
  });

  describe('judge model', () => {
    it('labels each evaluator once rather than every sub-score', () => {
      render(<ExampleScoresTable examples={[buildMixedJudgeExample()]} onTraceClick={jest.fn()} />);

      expect(screen.getAllByText('judged by openai-gpt-5.6-luna')).toHaveLength(1);
      expect(screen.getAllByText('judged by google-gemini-3.5-flash')).toHaveLength(1);
    });

    it('stays quiet when every evaluator shares one judge', () => {
      const example = buildMixedJudgeExample();
      render(
        <ExampleScoresTable
          examples={[
            {
              ...example,
              scores: example.scores.map((score) => ({
                ...score,
                evaluator: { ...score.evaluator, model: { id: 'openai-gpt-5.6-luna' } },
              })),
            },
          ]}
          onTraceClick={jest.fn()}
        />
      );

      expect(screen.queryByText(/openai-gpt-5\.6-luna/)).not.toBeInTheDocument();
    });

    it('labels sub-scores individually when one evaluator mixes judges', () => {
      const example = buildMixedJudgeExample();
      const [factuality, relevance, groundedness] = example.scores;
      render(
        <ExampleScoresTable
          examples={[
            {
              ...example,
              scores: [
                factuality,
                {
                  ...relevance,
                  evaluator: { ...relevance.evaluator, model: { id: 'anthropic-claude-9' } },
                },
                groundedness,
              ],
            },
          ]}
          onTraceClick={jest.fn()}
        />
      );

      expect(screen.getByText('judged by openai-gpt-5.6-luna')).toBeInTheDocument();
      expect(screen.getByText('judged by anthropic-claude-9')).toBeInTheDocument();
      expect(screen.getByText('judged by google-gemini-3.5-flash')).toBeInTheDocument();
    });

    it('stays quiet for code evaluators that carry no judge', () => {
      render(
        <ExampleScoresTable
          examples={[
            {
              example_id: 'example-code-only',
              example_index: 0,
              scores: [
                buildScore({
                  timestamp: '2026-03-02T12:00:00.000Z',
                  evaluatorName: 'latency',
                  evaluatorScore: 4.19,
                  repetitionIndex: 0,
                }),
                buildScore({
                  timestamp: '2026-03-02T12:00:00.000Z',
                  evaluatorName: 'input_tokens',
                  evaluatorScore: 32670,
                  repetitionIndex: 0,
                }),
              ].map((score) => ({
                ...score,
                evaluator: { ...score.evaluator, model: undefined },
              })),
            },
          ]}
          onTraceClick={jest.fn()}
        />
      );

      expect(screen.getByText('latency:')).toBeInTheDocument();
      expect(screen.queryByText(/judged by/)).not.toBeInTheDocument();
    });
  });

  it('renders evaluator label as a badge when present', () => {
    const examples: EvaluationExperimentDatasetExample[] = [
      {
        example_id: 'example-with-label',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'Factuality',
            evaluatorScore: 0.8,
            evaluatorLabel: 'ACCURATE',
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('Factuality:')).toBeInTheDocument();
    expect(screen.getByText('0.80')).toBeInTheDocument();
    expect(screen.getByText('ACCURATE')).toBeInTheDocument();
  });

  describe('getVerdictBadgeColor', () => {
    it('colors by score, so a label containing a positive word cannot turn a failure green', () => {
      expect(getVerdictBadgeColor('correctness-analysis', 0)).toEqual('danger');
      expect(getVerdictBadgeColor('groundedness-analysis', 0.2)).toEqual('danger');
      expect(getVerdictBadgeColor('incomplete-rule-assignment', 0)).toEqual('danger');
      expect(getVerdictBadgeColor('correctness-analysis', 1)).toEqual('success');
      expect(getVerdictBadgeColor('accurate', 0.6)).toEqual('warning');
    });

    it('classifies label-only verdicts by keyword, negated forms first', () => {
      expect(getVerdictBadgeColor('incorrect', null)).toEqual('danger');
      expect(getVerdictBadgeColor('inaccurate', null)).toEqual('danger');
      expect(getVerdictBadgeColor('ungrounded', null)).toEqual('danger');
      expect(getVerdictBadgeColor('no-match', null)).toEqual('danger');
      expect(getVerdictBadgeColor('not correct', null)).toEqual('danger');
      expect(getVerdictBadgeColor('not-grounded', null)).toEqual('danger');
      expect(getVerdictBadgeColor('unmatched', null)).toEqual('danger');
      expect(getVerdictBadgeColor('correct', null)).toEqual('success');
      expect(getVerdictBadgeColor('in-scope', null)).toEqual('success');
      expect(getVerdictBadgeColor('partial-match', null)).toEqual('warning');
      expect(getVerdictBadgeColor('something-bespoke', null)).toEqual('hollow');
    });

    it('leaves measurements uncolored, since they are not scored out of one', () => {
      // Latency in seconds and token counts would otherwise clear the 0.8 pass threshold.
      expect(getVerdictBadgeColor('ms', 4.2)).toEqual('hollow');
      expect(getVerdictBadgeColor('tokens', 40118)).toEqual('hollow');
      expect(getVerdictBadgeColor('drift', -3)).toEqual('hollow');
      // A label still classifies the verdict when the score itself says nothing.
      expect(getVerdictBadgeColor('incorrect', 12)).toEqual('danger');
    });

    it('keeps neutral sentinels gray whatever the score says', () => {
      expect(getVerdictBadgeColor('unavailable', 0)).toEqual('default');
      expect(getVerdictBadgeColor('not-applicable', 1)).toEqual('default');
      expect(getVerdictBadgeColor('N/A', 0)).toEqual('default');
      // An evaluator that could not judge is neither a pass nor a failure.
      expect(getVerdictBadgeColor('fixture-error', null)).toEqual('default');
    });
  });

  it('shows explanation and metadata when accordion is expanded', () => {
    const examples: EvaluationExperimentDatasetExample[] = [
      {
        example_id: 'example-with-details',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'Relevance',
            evaluatorScore: 0.9,
            evaluatorExplanation: 'The response is highly relevant.',
            evaluatorMetadata: { reason: 'matches topic' },
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('Relevance:')).toBeInTheDocument();
    expect(screen.getByText('0.90')).toBeInTheDocument();

    const accordion = screen.getByLabelText('Toggle details for evaluator Relevance');
    const accordionButton = accordion.querySelector('.euiAccordion__button') as HTMLButtonElement;
    fireEvent.click(accordionButton);

    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('The response is highly relevant.')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText(/"reason": "matches topic"/)).toBeInTheDocument();
  });

  it('shows evaluator trace button when evaluator trace_id is present', () => {
    const onTraceClick = jest.fn();
    const examples: EvaluationExperimentDatasetExample[] = [
      {
        example_id: 'example-with-eval-trace',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.7,
            evaluatorTraceId: 'eval-trace-abc123',
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={onTraceClick} />);

    const accordion = screen.getByLabelText('Toggle details for evaluator Criteria');
    const accordionButton = accordion.querySelector('.euiAccordion__button') as HTMLButtonElement;
    fireEvent.click(accordionButton);

    const viewTraceButton = screen.getByRole('button', {
      name: 'View trace for evaluator Criteria',
    });
    fireEvent.click(viewTraceButton);

    expect(onTraceClick).toHaveBeenCalledWith('eval-trace-abc123', 'example-with-eval-trace');
  });

  it('does not render accordion when no details are available', () => {
    const examples: EvaluationExperimentDatasetExample[] = [
      {
        example_id: 'example-no-details',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'SimpleScore',
            evaluatorScore: 1.0,
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('SimpleScore:')).toBeInTheDocument();
    expect(screen.getByText('1.00')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Toggle details for evaluator SimpleScore')
    ).not.toBeInTheDocument();
  });
});
