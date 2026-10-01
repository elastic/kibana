/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  EvaluationExperimentDatasetExample,
  GetEvaluationExperimentExampleDetailsResponse,
} from '@kbn/evals-common';
import { useExperimentExampleDetails } from '../../hooks/use_evals_api';
import { ExampleScoresTable, getVerdictBadgeColor } from '.';

jest.mock('../../hooks/use_evals_api');

const mockUseExperimentExampleDetails = jest.mocked(useExperimentExampleDetails);

const buildScore = ({
  timestamp = '2026-03-02T12:00:00.000Z',
  traceId,
  evaluatorName = 'Criteria',
  evaluatorScore = 0.9,
  evaluatorLabel,
  evaluatorExplanation,
  evaluatorMetadata,
  evaluatorTraceId,
  evaluatorModelId = 'evaluator-model-1',
  repetitionIndex = 0,
}: {
  timestamp?: string;
  traceId?: string | null;
  evaluatorName?: string;
  evaluatorScore?: number | null;
  evaluatorLabel?: string | null;
  evaluatorExplanation?: string | null;
  evaluatorMetadata?: Record<string, unknown> | null;
  evaluatorTraceId?: string | null;
  evaluatorModelId?: string;
  repetitionIndex?: number;
} = {}): EvaluationExperimentDatasetExample['scores'][number] => ({
  '@timestamp': timestamp,
  experiment_id: 'experiment-1',
  example: {
    id: 'example-1',
    index: 0,
    dataset: {
      id: 'dataset-1',
      name: 'Dataset 1',
    },
  },
  task: {
    trace_id: traceId,
    repetition_index: repetitionIndex,
    model: { id: 'task-model-1' },
  },
  evaluator: {
    name: evaluatorName,
    score: evaluatorScore,
    label: evaluatorLabel,
    explanation: evaluatorExplanation,
    metadata: evaluatorMetadata,
    trace_id: evaluatorTraceId,
    model: evaluatorModelId ? { id: evaluatorModelId } : undefined,
  },
  metadata: {
    total_repetitions: 2,
  },
});

const buildExample = (
  exampleId: string,
  scores: EvaluationExperimentDatasetExample['scores'] = [buildScore()],
  exampleIndex = 0,
  previews?: EvaluationExperimentDatasetExample['previews']
): EvaluationExperimentDatasetExample => ({
  example_id: exampleId,
  example_index: exampleIndex,
  scores,
  previews,
});

const buildDetails = (repetitionIndex: number): GetEvaluationExperimentExampleDetailsResponse => ({
  example: {
    input: { prompt: `input-r${repetitionIndex + 1}` },
  },
  task: {
    output: { completion: `output-r${repetitionIndex + 1}` },
  },
});

const defaultProps = {
  experimentId: 'experiment-1',
  datasetId: 'dataset-1',
  executionId: 'execution-1',
  onTraceClick: jest.fn(),
};

const renderTable = (
  examples: EvaluationExperimentDatasetExample[],
  props: Partial<React.ComponentProps<typeof ExampleScoresTable>> = {}
) => render(<ExampleScoresTable {...defaultProps} examples={examples} {...props} />);

describe('ExampleScoresTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExperimentExampleDetails.mockImplementation(
      (_experimentId, _datasetId, _exampleId, repetitionIndex, _executionId, options) =>
        ({
          data: options?.enabled ? buildDetails(repetitionIndex) : undefined,
          isLoading: false,
          error: null,
        } as ReturnType<typeof useExperimentExampleDetails>)
    );
  });

  it('renders every example without an example paginator', () => {
    const examples = Array.from({ length: 26 }, (_, index) =>
      buildExample(`example-${index + 1}`, [buildScore()], index)
    );

    const { container } = renderTable(examples);

    expect(container.querySelectorAll('[id^="evalsExampleRow-"]')).toHaveLength(26);
    expect(
      screen.queryByRole('navigation', { name: 'Example result pages' })
    ).not.toBeInTheDocument();
  });

  it('shows bounded previews and eager evaluator details, then loads full repetition content on request', () => {
    const truncatedInputPreview = `"${'x'.repeat(2047)}`;
    const example = buildExample(
      'example-1',
      [
        buildScore({
          traceId: 'task-trace-0',
          evaluatorTraceId: 'evaluator-trace-0',
          evaluatorExplanation: 'explanation-r1',
          evaluatorMetadata: { reason: 'reason-r1' },
          repetitionIndex: 0,
        }),
        buildScore({
          timestamp: '2026-03-02T12:00:01.000Z',
          traceId: 'task-trace-1',
          evaluatorTraceId: 'evaluator-trace-1',
          evaluatorScore: 0.2,
          evaluatorExplanation: 'explanation-r2',
          evaluatorMetadata: { reason: 'reason-r2' },
          repetitionIndex: 1,
        }),
      ],
      0,
      [
        {
          repetition_index: 0,
          input: { content: truncatedInputPreview, truncated: true },
          output: { content: '{"completion":"preview-output"}', truncated: false },
        },
        {
          repetition_index: 1,
          input: { content: '{"prompt":"preview-input-r2"}', truncated: false },
          output: { content: '{"completion":"preview-output-r2"}', truncated: false },
        },
      ]
    );

    renderTable([example]);

    expect(screen.queryByText(/input-r1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/output-r1/)).not.toBeInTheDocument();
    expect(screen.getByText(truncatedInputPreview)).toBeInTheDocument();
    expect(screen.getByText('{"completion":"preview-output"}')).toBeInTheDocument();
    expect(screen.queryByText(/Preview truncated/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View full input' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(
      mockUseExperimentExampleDetails.mock.calls.every(([, , , , , options]) => !options?.enabled)
    ).toBe(true);

    const evaluatorAccordion = screen.getByLabelText('Toggle details for evaluator Criteria');
    fireEvent.click(evaluatorAccordion.querySelector('.euiAccordion__button') as HTMLButtonElement);
    expect(screen.getByText('explanation-r1')).toBeInTheDocument();
    expect(screen.getByText(/"reason": "reason-r1"/)).toBeInTheDocument();
    expect(
      mockUseExperimentExampleDetails.mock.calls.every(([, , , , , options]) => !options?.enabled)
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'View full input' }));
    expect(screen.getByText(/"prompt": "input-r1"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide full input' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText('{"completion":"preview-output"}')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide full input' }));
    expect(screen.queryByText(/"prompt": "input-r1"/)).not.toBeInTheDocument();
    expect(screen.getByText(truncatedInputPreview)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View full input' }));
    expect(screen.getByText(/"prompt": "input-r1"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View full output' }));
    expect(screen.getByText(/"completion": "output-r1"/)).toBeInTheDocument();

    const repetitionPagination = screen.getByRole('navigation', {
      name: 'Select repetition for example example-1',
    });
    fireEvent.click(within(repetitionPagination).getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('{"prompt":"preview-input-r2"}')).toBeInTheDocument();
    expect(screen.getByText('{"completion":"preview-output-r2"}')).toBeInTheDocument();
    expect(screen.queryByText(truncatedInputPreview)).not.toBeInTheDocument();
    expect(screen.queryByText('{"completion":"preview-output"}')).not.toBeInTheDocument();
    expect(screen.queryByText(/"prompt": "input-r2"/)).not.toBeInTheDocument();
    expect(screen.queryByText(/"completion": "output-r2"/)).not.toBeInTheDocument();
    expect(screen.getByText('explanation-r2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View full output' }));
    expect(screen.getByText(/"completion": "output-r2"/)).toBeInTheDocument();
    expect(mockUseExperimentExampleDetails).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'example-1',
      1,
      'execution-1',
      { enabled: true }
    );

    fireEvent.click(screen.getByRole('button', { name: 'View full input' }));
    expect(screen.getByText(/"prompt": "input-r2"/)).toBeInTheDocument();
  });

  it('keeps task and evaluator trace actions available from score documents', () => {
    const onTraceClick = jest.fn();
    renderTable(
      [
        buildExample('example-with-traces', [
          buildScore({
            traceId: 'task-trace-summary',
            evaluatorTraceId: 'evaluator-trace-summary',
          }),
        ]),
      ],
      { onTraceClick }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open trace task-trace-summary' }));
    expect(onTraceClick).toHaveBeenCalledWith('task-trace-summary', 'example-with-traces');

    const evaluatorAccordion = screen.getByLabelText('Toggle details for evaluator Criteria');
    fireEvent.click(evaluatorAccordion.querySelector('.euiAccordion__button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'View trace for evaluator Criteria' }));
    expect(onTraceClick).toHaveBeenCalledWith('evaluator-trace-summary', 'example-with-traces');
    expect(
      mockUseExperimentExampleDetails.mock.calls.every(([, , , , , options]) => !options?.enabled)
    ).toBe(true);
  });

  it('shows score labels, verdicts, and judge attribution from score documents', () => {
    renderTable([
      buildExample('example-mixed-judges', [
        buildScore({
          evaluatorName: 'correctness.factuality',
          evaluatorScore: 0.71,
          evaluatorLabel: 'PARTIAL',
          evaluatorModelId: 'openai-gpt-5.6-luna',
        }),
        buildScore({
          evaluatorName: 'correctness.relevance',
          evaluatorScore: 0.5,
          evaluatorModelId: 'openai-gpt-5.6-luna',
        }),
        buildScore({
          evaluatorName: 'groundedness',
          evaluatorScore: 1,
          evaluatorModelId: 'google-gemini-3.5-flash',
        }),
      ]),
    ]);

    expect(screen.getByText('correctness')).toBeInTheDocument();
    expect(screen.getByText('factuality:')).toBeInTheDocument();
    expect(screen.getByText('0.71')).toBeInTheDocument();
    expect(screen.getByText('PARTIAL')).toBeInTheDocument();
    expect(screen.getByText('judged by openai-gpt-5.6-luna')).toBeInTheDocument();
    expect(screen.getByText('judged by google-gemini-3.5-flash')).toBeInTheDocument();
  });

  it('shows lazy-detail errors without hiding summary scores', () => {
    mockUseExperimentExampleDetails.mockImplementation(
      (_experimentId, _datasetId, _exampleId, _repetitionIndex, _executionId, options) =>
        ({
          data: undefined,
          isLoading: false,
          error: options?.enabled ? new Error('detail unavailable') : null,
        } as ReturnType<typeof useExperimentExampleDetails>)
    );
    renderTable([buildExample('example-error')]);

    fireEvent.click(screen.getByRole('button', { name: 'View full input' }));

    expect(
      screen.getByText(/Failed to load details: Error: detail unavailable/)
    ).toBeInTheDocument();
    expect(screen.getByText('Criteria:')).toBeInTheDocument();
    expect(screen.getByText('0.90')).toBeInTheDocument();
  });

  it('shows a loading state while requested details are pending', () => {
    mockUseExperimentExampleDetails.mockImplementation(
      (_experimentId, _datasetId, _exampleId, _repetitionIndex, _executionId, options) =>
        ({
          data: undefined,
          isLoading: Boolean(options?.enabled),
          error: null,
        } as ReturnType<typeof useExperimentExampleDetails>)
    );
    const { container } = renderTable([buildExample('example-loading')]);

    fireEvent.click(screen.getByRole('button', { name: 'View full output' }));

    expect(
      container.querySelector('[data-test-subj="evalsExampleDetailsLoading"]')
    ).toBeInTheDocument();
  });

  describe('getVerdictBadgeColor', () => {
    it('colors scored verdicts by score and label-only verdicts by keyword', () => {
      expect(getVerdictBadgeColor('correctness-analysis', 0)).toEqual('danger');
      expect(getVerdictBadgeColor('accurate', 0.6)).toEqual('warning');
      expect(getVerdictBadgeColor('correct', null)).toEqual('success');
      expect(getVerdictBadgeColor('not-grounded', null)).toEqual('danger');
      expect(getVerdictBadgeColor('partial-match', null)).toEqual('warning');
      expect(getVerdictBadgeColor('something-bespoke', null)).toEqual('hollow');
    });

    it('leaves measurements uncolored and neutral sentinels gray', () => {
      expect(getVerdictBadgeColor('tokens', 40118)).toEqual('hollow');
      expect(getVerdictBadgeColor('drift', -3)).toEqual('hollow');
      expect(getVerdictBadgeColor('unavailable', 0)).toEqual('default');
      expect(getVerdictBadgeColor('N/A', 0)).toEqual('default');
      expect(getVerdictBadgeColor('fixture-error', null)).toEqual('default');
    });
  });
});
