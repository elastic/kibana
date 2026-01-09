/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FailureStoreHoverLink } from './failure_store_link';
import type { DataStreamStat } from '../../../../common/data_streams_stats';

const mockUpdateFailureStore = jest.fn();
jest.mock('../../../hooks', () => ({
  useDatasetQualityTable: () => ({
    updateFailureStore: mockUpdateFailureStore,
  }),
}));

describe('FailureStoreHoverLink', () => {
  const mockDataStreamStat: DataStreamStat = {
    rawName: 'logs-test-stream-default',
    type: 'logs',
    name: 'test-stream',
    namespace: 'default',
    title: 'Test Stream',
    hasFailureStore: false,
    defaultRetentionPeriod: '30d',
    customRetentionPeriod: undefined,
  } as DataStreamStat;

  beforeEach(() => {
    mockUpdateFailureStore.mockClear();
  });

  describe('table', () => {
    it('renders the button with "N/A" text by default', () => {
      renderWithI18n(<FailureStoreHoverLink dataStreamStat={mockDataStreamStat} />);

      const button = screen.getByTestId(
        `datasetQualitySetFailureStoreLink-${mockDataStreamStat.rawName}`
      );
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('N/A');
    });

    it('shows tooltip with correct message', async () => {
      renderWithI18n(<FailureStoreHoverLink dataStreamStat={mockDataStreamStat} />);

      const button = screen.getByTestId(
        `datasetQualitySetFailureStoreLink-${mockDataStreamStat.rawName}`
      );
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByTestId('failureStoreNotEnabledTooltip')).toBeInTheDocument();
      });
    });

    it('changes text to "Set failure store" on hover', () => {
      renderWithI18n(<FailureStoreHoverLink dataStreamStat={mockDataStreamStat} />);

      const button = screen.getByTestId(
        `datasetQualitySetFailureStoreLink-${mockDataStreamStat.rawName}`
      );
      expect(button).toHaveTextContent('N/A');

      fireEvent.mouseEnter(button);
      expect(button).toHaveTextContent('Set failure store');

      fireEvent.mouseLeave(button);
      expect(button).toHaveTextContent('N/A');
    });

    it('opens modal when button is clicked', () => {
      renderWithI18n(<FailureStoreHoverLink dataStreamStat={mockDataStreamStat} />);

      const button = screen.getByTestId(
        `datasetQualitySetFailureStoreLink-${mockDataStreamStat.rawName}`
      );
      fireEvent.click(button);

      expect(screen.getByTestId('editFailureStoreModal')).toBeInTheDocument();
    });

    it('opens modal for a data stream with failure store disabled', () => {
      const disabledFsDataStream = {
        ...mockDataStreamStat,
        hasFailureStore: false,
      } as DataStreamStat;

      renderWithI18n(<FailureStoreHoverLink dataStreamStat={disabledFsDataStream} />);

      const button = screen.getByTestId(
        `datasetQualitySetFailureStoreLink-${disabledFsDataStream.rawName}`
      );
      fireEvent.click(button);

      expect(screen.getByTestId('editFailureStoreModal')).toBeInTheDocument();
    });

    it('calls updateFailureStore with custom retention period when provided', async () => {
      renderWithI18n(<FailureStoreHoverLink dataStreamStat={mockDataStreamStat} />);

      fireEvent.click(
        screen.getByTestId(`datasetQualitySetFailureStoreLink-${mockDataStreamStat.rawName}`)
      );
      fireEvent.click(screen.getByTestId('enableFailureStoreToggle'));
      fireEvent.click(screen.getByTestId('failureStoreModalSaveButton'));

      await waitFor(() => {
        expect(mockUpdateFailureStore).toHaveBeenCalledWith({
          failureStoreEnabled: true,
          customRetentionPeriod: undefined,
          dataStreamName: 'logs-test-stream-default',
        });
      });
    });
  });
});
