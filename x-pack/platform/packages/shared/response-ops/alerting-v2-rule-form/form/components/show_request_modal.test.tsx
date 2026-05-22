/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowRequestModal } from './show_request_modal';
import { createFormWrapper } from '../../test_utils';

describe('ShowRequestModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with create title by default', () => {
    render(<ShowRequestModal onClose={onClose} />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2ShowRequestModal')).toBeInTheDocument();
    expect(screen.getByTestId('showRequestModalTitle')).toHaveTextContent(
      'Create alerting rule request'
    );
  });

  it('renders create subtitle by default', () => {
    render(<ShowRequestModal onClose={onClose} />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('showRequestModalSubtitle')).toHaveTextContent(
      'This Kibana request will create this rule.'
    );
  });

  it('does not render tabs when ruleId is not provided', () => {
    render(<ShowRequestModal onClose={onClose} />, { wrapper: createFormWrapper() });

    expect(screen.queryByTestId('showRequestCreateTab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('showRequestUpdateTab')).not.toBeInTheDocument();
  });

  it('renders tabs when ruleId is provided', () => {
    render(<ShowRequestModal ruleId="rule-123" onClose={onClose} />, {
      wrapper: createFormWrapper(),
    });

    expect(screen.getByTestId('showRequestCreateTab')).toBeInTheDocument();
    expect(screen.getByTestId('showRequestUpdateTab')).toBeInTheDocument();
  });

  it('defaults to update tab when ruleId is provided', () => {
    render(<ShowRequestModal ruleId="rule-123" onClose={onClose} />, {
      wrapper: createFormWrapper(),
    });

    expect(screen.getByTestId('showRequestModalTitle')).toHaveTextContent(
      'Update alerting rule request'
    );
    expect(screen.getByTestId('showRequestModalSubtitle')).toHaveTextContent(
      'This Kibana request will update this rule.'
    );
  });

  it('switches to create tab from update default', async () => {
    const user = userEvent.setup();

    render(<ShowRequestModal ruleId="rule-123" onClose={onClose} />, {
      wrapper: createFormWrapper(),
    });

    await user.click(screen.getByTestId('showRequestCreateTab'));

    expect(screen.getByTestId('showRequestModalTitle')).toHaveTextContent(
      'Create alerting rule request'
    );
  });

  it('switches back to update tab', async () => {
    const user = userEvent.setup();

    render(<ShowRequestModal ruleId="rule-123" onClose={onClose} />, {
      wrapper: createFormWrapper(),
    });

    await user.click(screen.getByTestId('showRequestCreateTab'));
    await user.click(screen.getByTestId('showRequestUpdateTab'));

    expect(screen.getByTestId('showRequestModalTitle')).toHaveTextContent(
      'Update alerting rule request'
    );
  });

  it('renders the code block', () => {
    render(<ShowRequestModal onClose={onClose} />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('showRequestModalCodeBlock')).toBeInTheDocument();
  });

  it('calls onClose when modal close button is clicked', () => {
    render(<ShowRequestModal onClose={onClose} />, { wrapper: createFormWrapper() });

    fireEvent.click(screen.getByLabelText('Closes this modal window'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
