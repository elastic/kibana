/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';

import { AnonymizationSettingsModal } from '.';
import { TestProviders } from '../../../mock/test_providers/test_providers';

describe('AnonymizationSettingsModal', () => {
  const closeModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <TestProviders>
        <AnonymizationSettingsModal closeModal={closeModal} />
      </TestProviders>
    );
  });

  it('renders the anonymizationSettings', () => {
    expect(screen.getByTestId('anonymizationSettingsCallout')).toBeInTheDocument();
  });

  it('calls closeModal when Cancel is clicked', () => {
    fireEvent.click(screen.getByTestId('cancel'));

    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('calls closeModal when Save is clicked', () => {
    fireEvent.click(screen.getByTestId('save'));

    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
