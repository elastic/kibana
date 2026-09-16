/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlTimeRangeStep } from './esql_time_range_step';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiSuperDatePicker: ({
    start,
    end,
    onTimeChange,
  }: {
    start: string;
    end: string;
    onTimeChange: (range: { start: string; end: string; isInvalid: boolean }) => void;
  }) => (
    <>
      <button
        type="button"
        data-test-subj="mlEsqlTimeRange"
        data-start={start}
        data-end={end}
        onClick={() => onTimeChange({ start: 'now-1h', end: 'now-5m', isInvalid: false })}
      />
      <button
        type="button"
        data-test-subj="mlEsqlInvalidTimeRange"
        onClick={() => onTimeChange({ start: 'now', end: 'now-1h', isInvalid: true })}
      />
    </>
  ),
}));

const WizardState = () => {
  const { state } = useEsqlWizardContext();

  return (
    <output data-test-subj="mlEsqlWizardRange">{`${state.wizardStart}|${state.wizardEnd}`}</output>
  );
};

describe('EsqlTimeRangeStep', () => {
  it('uses bounded defaults instead of the classic job time range', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlTimeRangeStep />
        <WizardState />
      </EsqlWizardProvider>
    );

    expect(screen.getByTestId('mlEsqlTimeRange')).toHaveAttribute('data-start', 'now-15m');
    expect(screen.getByTestId('mlEsqlTimeRange')).toHaveAttribute('data-end', 'now');
    expect(screen.getByTestId('mlEsqlWizardRange')).not.toHaveTextContent('0');
    expect(screen.getByTestId('mlEsqlWizardRange')).not.toHaveTextContent('MAX');
  });

  it('persists a valid picker change in wizard state', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlTimeRangeStep />
        <WizardState />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByTestId('mlEsqlTimeRange'));

    expect(screen.getByTestId('mlEsqlWizardRange')).toHaveTextContent('now-1h|now-5m');
  });

  it('keeps the previous range when the picker rejects an invalid range', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlTimeRangeStep />
        <WizardState />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByTestId('mlEsqlInvalidTimeRange'));

    expect(screen.getByTestId('mlEsqlWizardRange')).toHaveTextContent('now-15m|now');
  });
});
