/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../../../../hooks', () => ({
  useStartServices: () => ({ automaticImport: undefined }),
  useGetCategoriesQuery: () => ({ data: { items: [] } }),
}));

import { ReviewApproveModal } from './review_approve_modal';
import type { ReviewIntegrationDetails } from './review_approve_modal';

type ReviewDataStream = ReviewIntegrationDetails['dataStreams'][number];

const completedStream = {
  dataStreamId: 'my_stream',
  title: 'My stream',
  status: 'completed',
  inputTypes: [{ name: 'filestream' }],
} as unknown as ReviewDataStream;

const processingStream = {
  dataStreamId: 'pending_stream',
  title: 'Pending stream',
  status: 'processing',
  inputTypes: [],
} as unknown as ReviewDataStream;

const reviewDetails: ReviewIntegrationDetails = {
  title: 'My integration',
  version: '1.0.0',
  dataStreams: [completedStream],
};

const DataStreamResultsFlyout = () => <div data-test-subj="dataStreamResultsFlyout" />;

const renderModal = (props: Partial<React.ComponentProps<typeof ReviewApproveModal>> = {}) =>
  render(
    <I18nProvider>
      <ReviewApproveModal
        isOpen={true}
        integrationId="my_integration"
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onFetchReviewDetails={jest.fn().mockResolvedValue(reviewDetails)}
        onApproveAndInstall={jest.fn()}
        DataStreamResultsFlyoutComponent={DataStreamResultsFlyout}
        {...props}
      />
    </I18nProvider>
  );

describe('ReviewApproveModal read-only mode', () => {
  it('lists the data streams and opens the results flyout', async () => {
    renderModal({ readOnly: true });

    await waitFor(() => {
      expect(screen.getByText('My stream')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open data stream results flyout' }));

    expect(screen.getByTestId('dataStreamResultsFlyout')).toBeInTheDocument();
  });

  it('hides the approval controls and shows a Close button', async () => {
    renderModal({ readOnly: true });

    await waitFor(() => {
      expect(screen.getByText('My stream')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('manageIntegrationReviewApproveInstallButton')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('manageIntegrationReviewAutoInstallCheckbox')
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Version')).not.toBeInTheDocument();
    expect(screen.getByTestId('manageIntegrationReviewModalClose')).toBeInTheDocument();
  });

  it('only enables the results flyout for data streams that have results', async () => {
    renderModal({
      readOnly: true,
      onFetchReviewDetails: jest
        .fn()
        .mockResolvedValue({ ...reviewDetails, dataStreams: [completedStream, processingStream] }),
    });

    await waitFor(() => {
      expect(screen.getByText('Pending stream')).toBeInTheDocument();
    });
    const openButtons = screen.getAllByRole('button', { name: 'Open data stream results flyout' });

    expect(openButtons).toHaveLength(2);
    expect(openButtons[0]).toBeEnabled();
    expect(openButtons[1]).toBeDisabled();
  });

  it('does not link data stream titles to the edit page', async () => {
    const onEdit = jest.fn();
    renderModal({ readOnly: true, onEdit });

    await waitFor(() => {
      expect(screen.getByText('My stream')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('My stream'));

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('keeps the Approve button and edit links in the default mode', async () => {
    const onEdit = jest.fn();
    renderModal({ onEdit });

    await waitFor(() => {
      expect(screen.getByText('My stream')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('My stream'));

    expect(onEdit).toHaveBeenCalledWith('my_integration');
    expect(screen.getByTestId('manageIntegrationReviewApproveInstallButton')).toBeInTheDocument();
  });
});
