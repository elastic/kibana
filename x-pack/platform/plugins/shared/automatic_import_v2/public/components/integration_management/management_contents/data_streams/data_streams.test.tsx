/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { DataStreams } from './data_streams';
import { UIStateProvider } from '../../contexts';
import { useGetIntegrationById } from '../../../../common';

jest.mock('../../../../common', () => ({
  useGetIntegrationById: jest.fn(),
  useDeleteDataStream: jest.fn(() => ({
    deleteDataStreamMutation: {
      mutate: jest.fn(),
      isLoading: false,
      variables: undefined,
    },
  })),
}));
const mockUseGetIntegrationById = useGetIntegrationById as jest.Mock;

jest.mock('./create_data_stream_flyout', () => ({
  CreateDataStreamFlyout: jest.fn(({ onClose }) => (
    <div data-test-subj="createDataStreamFlyoutMock">
      <button data-test-subj="mockFlyoutClose" onClick={onClose}>
        Close
      </button>
    </div>
  )),
}));

jest.mock('./data_streams_table/data_steams_table', () => ({
  DataStreamsTable: jest.fn(({ items }) => (
    <div data-test-subj="dataStreamsTableMock">{items.length} data streams</div>
  )),
}));

const renderDataStreams = (integrationId?: string) => {
  const path = integrationId ? `/edit/${integrationId}` : '/create';

  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <UIStateProvider>
          <Route path={['/edit/:integrationId', '/create']}>
            <DataStreams />
          </Route>
        </UIStateProvider>
      </MemoryRouter>
    </I18nProvider>
  );
};

describe('DataStreams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetIntegrationById.mockReturnValue({
      integration: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should render the component', () => {
      const { getByText } = renderDataStreams();
      expect(getByText('Data Streams')).toBeInTheDocument();
    });

    it('should show zero-state button when no data streams exist', () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: { dataStreams: [] },
        isLoading: false,
      });

      const { queryAllByTestId } = renderDataStreams('test-id');

      const addButtons = queryAllByTestId('addDataStreamButton');
      // Should have the zero-state button
      expect(addButtons.length).toBe(1);
    });

    it('should show zero-state button when integration is undefined', () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: undefined,
        isLoading: false,
      });

      const { queryAllByTestId } = renderDataStreams();

      const addButtons = queryAllByTestId('addDataStreamButton');
      expect(addButtons.length).toBe(1);
    });

    it('should show header button when data streams exist', () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: {
          dataStreams: [
            { dataStreamId: 'ds-1', title: 'Data Stream 1' },
            { dataStreamId: 'ds-2', title: 'Data Stream 2' },
          ],
        },
        isLoading: false,
      });

      const { getByTestId } = renderDataStreams('test-id');

      // Should have the header button only (not zero-state)
      expect(getByTestId('addDataStreamButton')).toBeInTheDocument();
    });
  });

  describe('flyout interactions', () => {
    it('should open flyout when add button is clicked', () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: undefined,
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = renderDataStreams();

      // Flyout should not be visible initially
      expect(queryByTestId('createDataStreamFlyoutMock')).not.toBeInTheDocument();

      // Click the add button
      fireEvent.click(getByTestId('addDataStreamButton'));

      // Flyout should now be visible
      expect(getByTestId('createDataStreamFlyoutMock')).toBeInTheDocument();
    });

    it('should close flyout when close is triggered', () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: undefined,
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = renderDataStreams();

      // Open the flyout
      fireEvent.click(getByTestId('addDataStreamButton'));
      expect(getByTestId('createDataStreamFlyoutMock')).toBeInTheDocument();

      // Close the flyout
      fireEvent.click(getByTestId('mockFlyoutClose'));

      // Flyout should be closed
      expect(queryByTestId('createDataStreamFlyoutMock')).not.toBeInTheDocument();
    });
  });

  describe('with existing data streams', () => {
    it('should render with data streams count for header button', () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: {
          dataStreams: [{ dataStreamId: 'ds-1', title: 'My Data Stream' }],
        },
        isLoading: false,
      });

      const { getByTestId, queryByText } = renderDataStreams('test-id');

      // Header button should exist
      expect(getByTestId('addDataStreamButton')).toBeInTheDocument();

      // Zero-state description should NOT be visible
      expect(queryByText(/No data streams have been configured/i)).not.toBeInTheDocument();
    });
  });
});
