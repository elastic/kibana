/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AllCasesSelectorModal } from '.';

import { renderWithTestingProviders } from '../../../common/mock';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';
import { useGetTags } from '../../../containers/use_get_tags';
import { useGetCategories } from '../../../containers/use_get_categories';

jest.mock('../../../containers/api');
jest.mock('../../../containers/user_profiles/api');
jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/use_get_categories');

const onRowClick = jest.fn();
const defaultProps = {
  onRowClick,
};

describe('AllCasesSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
    (useGetCategories as jest.Mock).mockReturnValue({
      data: ['beverages', 'snacks'],
      refetch: jest.fn(),
    });
  });

  it('renders', () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);

    expect(screen.getByTestId('all-cases-modal')).toBeInTheDocument();
  });

  it('Closing modal when pressing the x icon', async () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText('Closes this modal window'));

    expect(screen.queryByTestId('all-cases-modal')).toBeFalsy();
  });

  it('Closing modal when pressing the cancel button', async () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByTestId('all-cases-modal-cancel-button'));

    expect(screen.queryByTestId('all-cases-modal')).toBeFalsy();
  });

  it('should not show bulk actions and row actions on the modal', async () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('case-table-bulk-actions-link-icon')).toBeFalsy();
    expect(screen.queryByText('Actions')).toBeFalsy();
  });

  it('should show the select button', async () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(screen.getAllByTestId(/cases-table-row-select/).length).toBeGreaterThan(0);
  });

  it('should hide the metrics', async () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('cases-metrics-stats')).toBeFalsy();
  });

  it('should show the create case button', async () => {
    renderWithTestingProviders(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('cases-table-add-case-filter-bar')).toBeInTheDocument();
  });
});
