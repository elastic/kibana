/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmissionButtons } from './submission_buttons';
import { createFormWrapper } from '../../test_utils';

describe('SubmissionButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the show request button', () => {
    render(<SubmissionButtons isSubmitting={false} />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2FormShowRequestButton')).toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FormShowRequestButton')).toHaveTextContent('Show request');
  });

  it('opens the modal when show request button is clicked', async () => {
    const user = userEvent.setup();

    render(<SubmissionButtons isSubmitting={false} />, { wrapper: createFormWrapper() });

    expect(screen.queryByTestId('ruleV2ShowRequestModal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('ruleV2FormShowRequestButton'));

    expect(screen.getByTestId('ruleV2ShowRequestModal')).toBeInTheDocument();
  });

  it('disables show request button when submitting', () => {
    render(<SubmissionButtons isSubmitting />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2FormShowRequestButton')).toBeDisabled();
  });

  it('passes ruleId to the modal', async () => {
    const user = userEvent.setup();

    render(<SubmissionButtons isSubmitting={false} ruleId="rule-456" />, {
      wrapper: createFormWrapper(),
    });

    await user.click(screen.getByTestId('ruleV2FormShowRequestButton'));

    expect(screen.getByTestId('showRequestCreateTab')).toBeInTheDocument();
    expect(screen.getByTestId('showRequestUpdateTab')).toBeInTheDocument();
  });

  it('does not show tabs in modal when ruleId is not provided', async () => {
    const user = userEvent.setup();

    render(<SubmissionButtons isSubmitting={false} />, { wrapper: createFormWrapper() });

    await user.click(screen.getByTestId('ruleV2FormShowRequestButton'));

    expect(screen.queryByTestId('showRequestCreateTab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('showRequestUpdateTab')).not.toBeInTheDocument();
  });
});
