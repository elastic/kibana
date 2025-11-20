/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DefaultObservableTypesModal } from './default_observable_types_modal';
import { TestProviders } from '../../common/mock';

describe('DefaultObservableTypesModal', () => {
  it('renders', () => {
    render(<DefaultObservableTypesModal />, { wrapper: TestProviders });

    expect(screen.queryByTestId('default-observable-types-modal-body')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('default-observable-types-modal-header-title')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('default-observable-types-modal-button')).toBeInTheDocument();
  });

  it('it opens the modal', async () => {
    render(<DefaultObservableTypesModal />, { wrapper: TestProviders });
    expect(screen.queryByTestId('default-observable-types-modal-body')).not.toBeInTheDocument();

    const button = screen.getByTestId('default-observable-types-modal-button');
    button.click();
    expect(await screen.findByTestId('default-observable-types-modal-body')).toBeInTheDocument();
    expect(
      await screen.findByTestId('default-observable-types-modal-header-title')
    ).toBeInTheDocument();
  });
});
