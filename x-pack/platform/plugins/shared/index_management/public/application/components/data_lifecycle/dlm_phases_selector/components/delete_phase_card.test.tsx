/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import { DeletePhaseCard } from './delete_phase_card';

const defaultDuration = { enabled: true, value: '60', unit: 'd' };

const renderDeletePhaseCard = (props?: Partial<React.ComponentProps<typeof DeletePhaseCard>>) => {
  const onChange = jest.fn();

  const result = render(
    <IntlProvider>
      <DeletePhaseCard
        id="deletePhase"
        duration={defaultDuration}
        isCardDisabled={false}
        isFormDisabled={false}
        onChange={onChange}
        {...props}
      />
    </IntlProvider>
  );

  return { ...result, onChange };
};

describe('DeletePhaseCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides duration fields when the phase is disabled', () => {
    const { queryByTestId } = renderDeletePhaseCard({
      duration: { ...defaultDuration, enabled: false },
    });

    expect(queryByTestId('deleteDurationValue')).not.toBeInTheDocument();
  });

  it('shows duration fields when the phase is enabled', () => {
    const { getByTestId } = renderDeletePhaseCard();

    expect(getByTestId('deleteDurationValue')).toBeInTheDocument();
  });

  it('calls onChange when toggling the phase checkbox', () => {
    const { getByTestId, onChange } = renderDeletePhaseCard({
      duration: { ...defaultDuration, enabled: false },
    });

    fireEvent.click(getByTestId('dlmPhasesSelectorDeletePhaseCard'));

    expect(onChange).toHaveBeenCalledWith({
      enabled: true,
      value: '60',
      unit: 'd',
    });
  });

  it('disables the duration fields when isCardDisabled is true', () => {
    const { getByTestId } = renderDeletePhaseCard({
      isCardDisabled: true,
    });

    expect(getByTestId('deleteDurationValue')).toBeDisabled();
    expect(getByTestId('deleteDurationUnit')).toBeDisabled();
  });

  it('disables the duration fields when isFormDisabled is true', () => {
    const { getByTestId } = renderDeletePhaseCard({
      isFormDisabled: true,
    });

    expect(getByTestId('deleteDurationValue')).toBeDisabled();
    expect(getByTestId('deleteDurationUnit')).toBeDisabled();
  });

  it('disables the duration fields when both isCardDisabled and isFormDisabled are true', () => {
    const { getByTestId } = renderDeletePhaseCard({
      isCardDisabled: true,
      isFormDisabled: true,
    });

    expect(getByTestId('deleteDurationValue')).toBeDisabled();
    expect(getByTestId('deleteDurationUnit')).toBeDisabled();
  });

  it('renders a validation error when durationError is provided', () => {
    const { getByTestId } = renderDeletePhaseCard({
      durationError: 'Enter a whole number greater than 0.',
    });

    expect(getByTestId('deleteDurationFormRow')).toBeInTheDocument();
    expect(getByTestId('deleteDurationFormRow')).toHaveTextContent(
      'Enter a whole number greater than 0.'
    );
  });

  it('renders help text when provided', () => {
    const { getByTestId } = renderDeletePhaseCard({
      helpText: <span>Must occur after the frozen phase (30d).</span>,
    });

    expect(getByTestId('deleteDurationFormRow')).toBeInTheDocument();
    expect(getByTestId('deleteDurationFormRow')).toHaveTextContent(
      'Must occur after the frozen phase (30d).'
    );
  });
});
