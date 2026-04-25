/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { mockCase, mockObservables } from '../../containers/mock';
import { ObservablesUtilityBar } from './observables_utility_bar';
import { renderWithTestingProviders } from '../../common/mock';
import { useCasesFeatures } from '../../common/use_cases_features';

jest.mock('../../common/use_cases_features');

describe('ObservablesUtilityBar', () => {
  const props = {
    caseData: { ...mockCase, observables: mockObservables },
    isLoading: false,
    isEnabled: true,
    onExtractObservablesChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    (useCasesFeatures as jest.Mock).mockReturnValue({
      isExtractObservablesEnabled: true,
      observablesAuthorized: true,
    });
    renderWithTestingProviders(<ObservablesUtilityBar {...props} />);

    expect(screen.getByTestId('cases-observables-table-results-count')).toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-table-results-count')).toHaveTextContent(
      'Showing 2 observables'
    );
    expect(screen.getByTestId('extract-observables-switch')).toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-add')).toBeInTheDocument();
  });

  it('does not render auto extract observable section without platinum+ license', () => {
    (useCasesFeatures as jest.Mock).mockReturnValue({
      isExtractObservablesEnabled: true,
      observablesAuthorized: false,
    });
    renderWithTestingProviders(<ObservablesUtilityBar {...props} />);

    expect(screen.getByTestId('cases-observables-table-results-count')).toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-add')).toBeInTheDocument();

    expect(screen.queryByTestId('extract-observables-switch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('default-observable-types-modal-body')).not.toBeInTheDocument();
  });

  it('does not render auto extract observable section when extract observables is disabled', () => {
    (useCasesFeatures as jest.Mock).mockReturnValue({
      isExtractObservablesEnabled: false,
      observablesAuthorized: true,
    });
    renderWithTestingProviders(<ObservablesUtilityBar {...props} />);

    expect(screen.getByTestId('cases-observables-table-results-count')).toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-add')).toBeInTheDocument();

    expect(screen.queryByTestId('extract-observables-switch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('default-observable-types-modal-body')).not.toBeInTheDocument();
  });
});
