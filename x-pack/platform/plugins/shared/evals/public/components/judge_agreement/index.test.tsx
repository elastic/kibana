/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { BinaryAgreement } from '@kbn/evals-common';
import { useEvaluatorReviewAgreement } from '../../hooks/use_review_queues_api';
import { EvaluatorAgreementBadge, JudgeAgreementPanel } from '.';

jest.mock('../../hooks/use_review_queues_api');

const mockedUseAgreement = jest.mocked(useEvaluatorReviewAgreement);

const binary = (overrides: Partial<BinaryAgreement> = {}): BinaryAgreement => ({
  n: 54,
  confusion: { tp: 30, fp: 4, fn: 3, tn: 17 },
  rawAgreement: 0.87,
  rawAgreementInterval: { low: 0.75, high: 0.94 },
  kappa: 0.71,
  kappaInterval: { low: 0.58, high: 0.82 },
  precision: 0.88,
  precisionInterval: { low: 0.73, high: 0.95 },
  recall: 0.91,
  recallInterval: { low: 0.76, high: 0.97 },
  ...overrides,
});

const renderBadge = (data: unknown, version = '2.4.0') => {
  mockedUseAgreement.mockReturnValue({ data } as unknown as ReturnType<
    typeof useEvaluatorReviewAgreement
  >);
  return render(
    <I18nProvider>
      <EvaluatorAgreementBadge evaluatorName="correctness" version={version} />
    </I18nProvider>
  );
};

describe('EvaluatorAgreementBadge', () => {
  it('shows kappa with its interval, n and the major version line', () => {
    renderBadge({ binary: binary() });

    expect(screen.getByTestId('evalsEvaluatorAgreementBadge')).toHaveTextContent(
      'judge agreement: κ=0.71 [0.58, 0.82], n=54 (v2.x)'
    );
    expect(mockedUseAgreement).toHaveBeenCalledWith('correctness', '2.4.0');
  });

  it('renders nothing before a reviewer has labelled an item', () => {
    renderBadge({ binary: null });
    expect(screen.queryByTestId('evalsEvaluatorAgreementBadge')).not.toBeInTheDocument();
  });

  it('renders nothing while the agreement is still loading', () => {
    renderBadge(undefined);
    expect(screen.queryByTestId('evalsEvaluatorAgreementBadge')).not.toBeInTheDocument();
  });

  it('says n/a instead of a number when kappa is undefined', () => {
    renderBadge({ binary: binary({ kappa: null, kappaInterval: null, n: 3 }) });
    expect(screen.getByTestId('evalsEvaluatorAgreementBadge')).toHaveTextContent('κ=n/a, n=3');
  });
});

describe('JudgeAgreementPanel', () => {
  const renderPanel = (b: BinaryAgreement | null) =>
    render(
      <I18nProvider>
        <JudgeAgreementPanel binary={b} ordinal={null} />
      </I18nProvider>
    );

  it('lists kappa, precision and recall with their intervals', () => {
    renderPanel(binary());

    const panel = screen.getByTestId('evalsJudgeAgreement');
    expect(panel).toHaveTextContent('0.71 [0.58, 0.82]');
    expect(panel).toHaveTextContent('0.88 [0.73, 0.95]');
    expect(panel).toHaveTextContent('87%');
    expect(panel).toHaveTextContent('54');
  });

  it('explains the empty state before any review', () => {
    renderPanel(null);
    expect(screen.getByTestId('evalsJudgeAgreementEmpty')).toBeInTheDocument();
  });

  it('still shows the weighted kappa when no binary verdicts exist', () => {
    render(
      <I18nProvider>
        <JudgeAgreementPanel binary={null} ordinal={{ n: 4, weightedKappa: 0.62 }} />
      </I18nProvider>
    );

    expect(screen.queryByTestId('evalsJudgeAgreementEmpty')).not.toBeInTheDocument();
    expect(screen.getByTestId('evalsJudgeAgreement')).toHaveTextContent('0.62');
  });
});
