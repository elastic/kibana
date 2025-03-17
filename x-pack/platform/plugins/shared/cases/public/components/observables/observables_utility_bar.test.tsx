/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AddObservableProps } from './add_observable';
import { mockCase } from '../../containers/mock';
import { ObservablesUtilityBar } from './observables_utility_bar';
import { renderWithTestingProviders } from '../../common/mock';

describe('ObservablesUtilityBar', () => {
  const props: AddObservableProps = {
    caseData: mockCase,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<ObservablesUtilityBar {...props} />);

    expect(screen.getByTestId('cases-observables-add')).toBeInTheDocument();
  });
});
