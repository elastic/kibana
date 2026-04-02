/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { ScanUsageResults } from './scan_usage_results';
import { useKibana } from '../../../../../../hooks/use_kibana';

jest.mock('../../../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;
const mockGetUrl = jest.fn();
const mockLocatorGet = jest.fn();
const mockOnCheckboxChange = jest.fn();

describe('ScanUsageResults', () => {
  const items = [
    {
      id: 'index-1',
      type: 'Index',
    },
    {
      id: 'pipeline-1',
      type: 'Pipeline',
    },
  ];
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrl.mockResolvedValue('/index_management/indices');
    mockLocatorGet.mockReturnValue({ getUrl: mockGetUrl });

    mockUseKibana.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: mockLocatorGet,
            },
          },
        },
      },
    });

    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <ScanUsageResults
        list={items}
        ignoreWarningCheckbox={false}
        onIgnoreWarningCheckboxChange={mockOnCheckboxChange}
      />
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders', () => {
    expect(screen.getByText('Potential Failures')).toBeInTheDocument();
    expect(screen.getByText('Found 2 usages')).toBeInTheDocument();
    expect(screen.getByText('Open Index Management')).toBeInTheDocument();
    expect(screen.getAllByTestId('usageItem')).toHaveLength(2);

    const checkbox = screen.getByTestId('warningCheckbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveProperty('checked', false);
  });

  it('opens index management in a new tab', async () => {
    fireEvent.click(screen.getByTestId('inferenceManagementOpenIndexManagement'));

    expect(mockLocatorGet).toHaveBeenCalledWith('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    expect(mockGetUrl).toHaveBeenCalledWith({ page: 'index_list' });

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('/index_management/indices', '_blank');
    });
  });

  it('onCheckboxChange gets called with correct params', () => {
    fireEvent.click(screen.getByTestId('warningCheckbox'));
    expect(mockOnCheckboxChange).toHaveBeenCalledWith(true);
  });
});
