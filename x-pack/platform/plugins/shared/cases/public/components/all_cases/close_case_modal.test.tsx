/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { CloseCaseModal } from './close_case_modal';
import * as i18n from './translations';

const defaultCloseReasonOptions = [
  { label: 'Close without reason', key: undefined, checked: 'on' as const },
  { label: 'Duplicate', key: 'duplicate' },
  { label: 'False Positive', key: 'false_positive' },
];

describe('CloseCaseModal', () => {
  const onClose = jest.fn();
  const onSubmit = jest.fn();
  const onCloseReasonOptionsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal title', () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    expect(screen.getByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE })).toBeInTheDocument();
    expect(screen.getByText(i18n.CLOSE_CASE_MODAL_TITLE)).toBeInTheDocument();
  });

  it('renders the disclaimer callout', () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    expect(screen.getByText(i18n.CLOSE_CASE_MODAL_DISCLAIMER)).toBeInTheDocument();
  });

  it('renders close reason options', () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    expect(screen.getByText('Close without reason')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('False Positive')).toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', async () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the modal close icon is clicked', async () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    await userEvent.click(screen.getByLabelText('Closes this modal window'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when the confirm button is clicked', async () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CONFIRM));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onCloseReasonOptionsChange when an option is selected', async () => {
    renderWithTestingProviders(
      <CloseCaseModal
        closeReasonOptions={defaultCloseReasonOptions}
        onClose={onClose}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    );

    await userEvent.click(screen.getByText('Duplicate'));

    expect(onCloseReasonOptionsChange).toHaveBeenCalled();
  });
});
