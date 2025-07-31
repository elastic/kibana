/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { UpdateIndexModalStep } from './update_step';
import type { ReindexState } from '../../../use_reindex';
import type { UpdateIndexState } from '../../../use_update_index';

// Helper to wrap components in I18nProvider
const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('UpdateIndexModalStep', () => {
  const meta: ReindexState['meta'] = {
    indexName: 'some_index',
    aliases: [],
    isInDataStream: false,
    isFrozen: false,
    isReadonly: false,
    isClosedIndex: false,
    reindexName: 'some_index-reindexed-for-9',
    isFollowerIndex: false,
  };

  const defaultUpdateIndexState: UpdateIndexState = {
    status: 'incomplete',
    failedBefore: false,
  };

  it('renders makeReadonly operation', () => {
    renderWithI18n(
      <UpdateIndexModalStep
        action="makeReadonly"
        meta={meta}
        closeModal={jest.fn()}
        retry={jest.fn()}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(screen.getByTestId('updateIndexModalTitle')).toHaveTextContent(
      'Setting index to read-only'
    );
    expect(screen.getByTestId('updateIndexProgress')).toHaveTextContent('Upgrade in progress');
    expect(
      screen.getByText(
        (content, element) => element?.textContent === 'Setting some_index index to read-only.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('closeUpdateStepButton')).toHaveTextContent('Close');
  });

  it('renders unfreeze operation', () => {
    renderWithI18n(
      <UpdateIndexModalStep
        action="unfreeze"
        closeModal={jest.fn()}
        meta={meta}
        retry={jest.fn()}
        updateIndexState={defaultUpdateIndexState}
      />
    );

    expect(screen.getByTestId('updateIndexModalTitle')).toHaveTextContent('Unfreezing index');
    expect(screen.getByTestId('updateIndexProgress')).toHaveTextContent('Upgrade in progress');
    expect(
      screen.getByText(
        (content, element) => element?.textContent === 'Unfreezing some_index index.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('closeUpdateStepButton')).toHaveTextContent('Close');
  });

  it('calls closeModal when close button is clicked', async () => {
    const closeModal = jest.fn();
    renderWithI18n(
      <UpdateIndexModalStep
        action="makeReadonly"
        meta={meta}
        closeModal={closeModal}
        retry={jest.fn()}
        updateIndexState={defaultUpdateIndexState}
      />
    );
    await userEvent.click(screen.getByTestId('closeUpdateStepButton'));
    expect(closeModal).toHaveBeenCalled();
  });

  it('shows retry button if failedBefore and not complete', () => {
    renderWithI18n(
      <UpdateIndexModalStep
        action="makeReadonly"
        meta={meta}
        closeModal={jest.fn()}
        retry={jest.fn()}
        updateIndexState={{ status: 'failed', failedBefore: true, reason: 'Some error' }}
      />
    );
    expect(screen.getByTestId('retryUpdateStepButton')).toBeInTheDocument();
    expect(screen.getByTestId('retryUpdateStepButton')).toHaveTextContent('Retry');
    expect(screen.getByText('There was an error')).toBeInTheDocument();
    expect(screen.getByText('Some error')).toBeInTheDocument();
  });

  it('calls retry when retry button is clicked', async () => {
    const retry = jest.fn();
    renderWithI18n(
      <UpdateIndexModalStep
        action="makeReadonly"
        meta={meta}
        closeModal={jest.fn()}
        retry={retry}
        updateIndexState={{ status: 'failed', failedBefore: true, reason: 'Some error' }}
      />
    );
    await userEvent.click(screen.getByTestId('retryUpdateStepButton'));
    expect(retry).toHaveBeenCalled();
  });
});
