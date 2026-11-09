/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EvaluatorDetailFlyout } from './evaluator_detail_flyout';
import { useEvaluator } from '../../hooks/use_evaluators_api';

jest.mock('../../hooks/use_evaluators_api');

const mockedUseEvaluator = jest.mocked(useEvaluator);

const JUDGE = {
  prompt: 'Rate {{{agent_response}}} against {{{expected}}}',
  system_prompt: 'Judge only the tone.',
  evidence: ['response'],
  reference_data_keys: ['expected'],
  output: {
    scores: [
      { name: 'tone', type: 'number', description: 'How warm the reply reads' },
      {
        name: 'verdict',
        type: 'categorical',
        labels: [
          { value: 'pass', score: 1 },
          { value: 'fail', score: 0 },
        ],
      },
    ],
  },
};

const USER_DEFINED = {
  name: 'tone-judge',
  version: '1.2.0',
  kind: 'llm',
  origin: 'user_defined',
  description: 'Rates tone of the response',
  updated_at: '2026-01-02T03:04:05.000Z',
  created_by: 'elastic',
  judge: JUDGE,
  versions: ['1.2.0', '1.1.0', '1.0.0'],
};

const renderFlyout = ({
  evaluator = USER_DEFINED,
  isLoading = false,
  error = null,
  canEdit = true,
  onEdit = jest.fn(),
}: {
  evaluator?: unknown;
  isLoading?: boolean;
  error?: unknown;
  canEdit?: boolean;
  onEdit?: () => void;
} = {}) => {
  mockedUseEvaluator.mockReturnValue({
    data: evaluator ? { evaluator } : undefined,
    isLoading,
    error,
  } as unknown as ReturnType<typeof useEvaluator>);

  return render(
    <I18nProvider>
      <EvaluatorDetailFlyout
        evaluatorName="tone-judge"
        canEdit={canEdit}
        onEdit={onEdit}
        onClose={jest.fn()}
      />
    </I18nProvider>
  );
};

describe('EvaluatorDetailFlyout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the stored definition without any editable field', () => {
    renderFlyout();

    expect(screen.getByText('Rates tone of the response')).toBeInTheDocument();
    expect(screen.getByText('Judge only the tone.')).toBeInTheDocument();
    expect(screen.getByText(/Rate \{\{\{agent_response\}\}\}/)).toBeInTheDocument();
    expect(screen.getByText('expected')).toBeInTheDocument();
    // Read-only: nothing in the body accepts input.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('dates the definition in words rather than a raw timestamp', () => {
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    renderFlyout({ evaluator: { ...USER_DEFINED, updated_at: anHourAgo } });

    const byline = screen.getByTestId('evalsEvaluatorDetailUpdated');
    expect(byline).toHaveTextContent(/^Updated .+ ago by elastic$/);
    expect(byline).not.toHaveTextContent(anHourAgo);
  });

  it('omits the byline for a built-in, which nobody edited', () => {
    renderFlyout({
      evaluator: {
        name: 'latency',
        version: '1.0.0',
        kind: 'code',
        origin: 'built_in',
        description: 'Returns total trace latency',
        versions: ['1.0.0'],
      },
    });

    expect(screen.queryByTestId('evalsEvaluatorDetailUpdated')).not.toBeInTheDocument();
  });

  it('spells out how each score is produced', () => {
    renderFlyout();

    expect(screen.getByText('tone')).toBeInTheDocument();
    expect(screen.getByText('How warm the reply reads')).toBeInTheDocument();
    expect(screen.getByText('Number from 0 to 1')).toBeInTheDocument();
    expect(screen.getByText('Categorical: pass=1, fail=0')).toBeInTheDocument();
  });

  it("shows each score's direction, reading a score saved without one as higher is better", () => {
    renderFlyout({
      evaluator: {
        ...USER_DEFINED,
        judge: {
          ...JUDGE,
          output: {
            scores: [
              { name: 'tone', type: 'number' },
              { name: 'hallucination', type: 'number', direction: 'minimize' },
              { name: 'length', type: 'number', direction: 'neutral' },
            ],
          },
        },
      },
    });

    expect(screen.getByTestId('evalsEvaluatorDetailDirection-tone')).toHaveTextContent(
      'Higher is better'
    );
    expect(screen.getByTestId('evalsEvaluatorDetailDirection-hallucination')).toHaveTextContent(
      'Lower is better'
    );
    expect(screen.getByTestId('evalsEvaluatorDetailDirection-length')).toHaveTextContent('Neutral');
  });

  it('marks which version is the one experiments would pick up', () => {
    renderFlyout();

    const versions = screen.getByTestId('evalsEvaluatorDetailVersion');
    expect(versions).toHaveValue('1.2.0');
    expect(within(versions).getByText('1.2.0 (current)')).toBeInTheDocument();
    expect(within(versions).getByText('1.0.0')).toBeInTheDocument();
  });

  it('refetches the definition as it stood at an older version', () => {
    renderFlyout();

    fireEvent.change(screen.getByTestId('evalsEvaluatorDetailVersion'), {
      target: { value: '1.0.0' },
    });

    expect(mockedUseEvaluator).toHaveBeenLastCalledWith('tone-judge', '1.0.0');
  });

  it('follows the click while the chosen version is still loading', () => {
    // `keepPreviousData` leaves the previous definition on screen, so the control has to
    // report the choice rather than what is currently rendered.
    renderFlyout();

    fireEvent.change(screen.getByTestId('evalsEvaluatorDetailVersion'), {
      target: { value: '1.0.0' },
    });

    expect(screen.getByTestId('evalsEvaluatorDetailVersion')).toHaveValue('1.0.0');
    // Still showing 1.2.0's content, and crucially not an empty shell.
    expect(screen.getByText('Judge only the tone.')).toBeInTheDocument();
  });

  it('marks the body as pending while it belongs to a version other than the selected one', () => {
    renderFlyout();

    fireEvent.change(screen.getByTestId('evalsEvaluatorDetailVersion'), {
      target: { value: '1.0.0' },
    });

    // The header names 1.0.0 while 1.2.0 is still rendered, so the body cannot be
    // presented as the selected definition.
    expect(screen.getByTestId('evalsEvaluatorDetailPending')).toBeInTheDocument();
    expect(screen.getByText('Judge only the tone.').closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('presents nothing as pending once the selected version is the one rendered', () => {
    renderFlyout();

    expect(screen.queryByTestId('evalsEvaluatorDetailPending')).not.toBeInTheDocument();
  });

  it('puts the selector back to what is on screen when the fetch fails', async () => {
    renderFlyout({ error: new Error('Version not found') });

    fireEvent.change(screen.getByTestId('evalsEvaluatorDetailVersion'), {
      target: { value: '1.0.0' },
    });

    // Leaving it on 1.0.0 would label 1.2.0's prompt as a version that never loaded.
    await waitFor(() =>
      expect(screen.getByTestId('evalsEvaluatorDetailVersion')).toHaveValue('1.2.0')
    );
    expect(screen.queryByTestId('evalsEvaluatorDetailPending')).not.toBeInTheDocument();
  });

  it('keeps the displayed version when another fails to load, and retries in place', async () => {
    // A failed query drops its data, so the flyout has to hold on to what it last showed.
    const older = { ...USER_DEFINED, version: '1.0.0', description: 'The first tone judge' };
    const olderError = new Error('Version 1.0.0 is unavailable');
    // React Query keeps a key's last error while it refetches it, so a retry passes through a
    // state holding both the old error and `isFetching` before the data arrives.
    let olderState: 'failed' | 'refetching' | 'loaded' = 'failed';
    const olderResults = {
      failed: { data: undefined, isLoading: false, isFetching: false, error: olderError },
      refetching: { data: undefined, isLoading: false, isFetching: true, error: olderError },
      loaded: { data: { evaluator: older }, isLoading: false, isFetching: false, error: null },
    };
    mockedUseEvaluator.mockImplementation(
      (_name?: string, version?: string) =>
        (version === '1.0.0'
          ? olderResults[olderState]
          : {
              data: { evaluator: USER_DEFINED },
              isLoading: false,
              isFetching: false,
              error: null,
            }) as unknown as ReturnType<typeof useEvaluator>
    );
    const flyout = () => (
      <I18nProvider>
        <EvaluatorDetailFlyout
          evaluatorName="tone-judge"
          canEdit
          onEdit={jest.fn()}
          onClose={jest.fn()}
        />
      </I18nProvider>
    );
    const { rerender } = render(flyout());

    fireEvent.change(screen.getByTestId('evalsEvaluatorDetailVersion'), {
      target: { value: '1.0.0' },
    });

    const failure = await screen.findByTestId('evalsEvaluatorDetailVersionError');
    expect(failure).toHaveTextContent('Could not load version 1.0.0');
    expect(failure).toHaveTextContent('Version 1.0.0 is unavailable');
    expect(screen.getByTestId('evalsEvaluatorDetailVersion')).toHaveValue('1.2.0');
    expect(screen.getByText('Rates tone of the response')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsEvaluatorDetailError')).not.toBeInTheDocument();

    olderState = 'refetching';
    fireEvent.click(screen.getByTestId('evalsEvaluatorDetailVersionRetry'));

    // The stale error must not be read as the retry failing: the selection holds while the
    // request is in flight, with the loaded version dimmed behind it.
    expect(screen.getByTestId('evalsEvaluatorDetailVersion')).toHaveValue('1.0.0');
    expect(screen.queryByTestId('evalsEvaluatorDetailVersionError')).not.toBeInTheDocument();
    expect(screen.getByTestId('evalsEvaluatorDetailPending')).toHaveTextContent('Loading 1.0.0');

    olderState = 'loaded';
    rerender(flyout());

    expect(await screen.findByText('The first tone judge')).toBeInTheDocument();
    expect(screen.getByTestId('evalsEvaluatorDetailVersion')).toHaveValue('1.0.0');
    expect(screen.queryByTestId('evalsEvaluatorDetailVersionError')).not.toBeInTheDocument();
  });

  it('offers no version picker when nothing has been edited yet', () => {
    renderFlyout({ evaluator: { ...USER_DEFINED, versions: ['1.0.0'], version: '1.0.0' } });

    expect(screen.queryByTestId('evalsEvaluatorDetailVersion')).not.toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
  });

  it('explains why a built-in evaluator shows no prompt', () => {
    renderFlyout({
      evaluator: {
        name: 'latency',
        version: '1.0.0',
        kind: 'code',
        origin: 'built_in',
        description: 'Returns total trace latency',
        versions: ['1.0.0'],
      },
    });

    expect(
      screen.getByText('Built-in evaluators are defined in code, so they have no editable prompt.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('evalsEvaluatorDetailEdit')).not.toBeInTheDocument();
  });

  it('keeps the edit hand-off out of reach without the manage privilege', () => {
    renderFlyout({ canEdit: false });

    expect(screen.queryByTestId('evalsEvaluatorDetailEdit')).not.toBeInTheDocument();
  });

  it('hands off to the editor', () => {
    const onEdit = jest.fn();
    renderFlyout({ onEdit });

    fireEvent.click(screen.getByTestId('evalsEvaluatorDetailEdit'));

    expect(onEdit).toHaveBeenCalled();
  });

  it('reports a failed load instead of rendering an empty shell', () => {
    renderFlyout({ evaluator: null, error: new Error('Evaluator not found') });

    expect(screen.getByTestId('evalsEvaluatorDetailError')).toHaveTextContent(
      'Evaluator not found'
    );
  });
});
