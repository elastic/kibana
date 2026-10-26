/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { StepFooter } from './step_footer';

describe('StepFooter', () => {
  it('renders the forward actions', () => {
    render(
      <I18nProvider>
        <StepFooter>
          <button>Next</button>
        </StepFooter>
      </I18nProvider>
    );
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('renders a Back button that calls onBack', () => {
    const onBack = jest.fn();
    render(
      <I18nProvider>
        <StepFooter onBack={onBack}>
          <button>Next</button>
        </StepFooter>
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('onboardingStepFooter-backButton'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('omits the Back button when there is no previous step', () => {
    render(
      <I18nProvider>
        <StepFooter>
          <button>Next</button>
        </StepFooter>
      </I18nProvider>
    );
    expect(screen.queryByTestId('onboardingStepFooter-backButton')).not.toBeInTheDocument();
  });
});
