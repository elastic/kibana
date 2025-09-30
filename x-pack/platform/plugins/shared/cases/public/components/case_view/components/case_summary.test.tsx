/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCaseSummary } from '../../../containers/use_get_case_summary';
import { useGetInferenceConnectors } from '../../../containers/use_get_inference_connectors';
import { useLicense } from '../../../common/use_license';
import { CaseSummary } from './case_summary';

jest.mock('../../../containers/use_get_case_summary');
jest.mock('../../../containers/use_get_inference_connectors');
jest.mock('../../../common/use_license');

const useGetCaseSummaryMock = useGetCaseSummary as jest.Mock;
const useGetInferenceConnectorsMock = useGetInferenceConnectors as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;

describe('CaseSummary', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    useGetCaseSummaryMock.mockImplementation(() => ({
      data: { content: 'This is a case summary.', generatedAt: '2025-08-26T12:00:00Z' },
      error: null,
      refetch: jest.fn(),
    }));

    useGetInferenceConnectorsMock.mockImplementation(() => ({
      data: { connectors: [{ connectorId: 'test-connector' }] },
    }));

    useLicenseMock.mockImplementation(() => ({
      isAtLeastEnterprise: () => true,
    }));
  });

  it('renders case summary with title and summary', () => {
    renderWithTestingProviders(<CaseSummary caseId="test-case" />);
    expect(screen.getByText('Case summary')).toBeInTheDocument();
    expect(screen.getByText('This is a case summary.')).toBeInTheDocument();
  });

  it('calls refetch when toggled open and summary is missing', () => {
    const refetchMock = jest.fn();
    useGetCaseSummaryMock.mockReturnValue({
      data: undefined,
      error: null,
      refetch: refetchMock,
    });

    renderWithTestingProviders(<CaseSummary caseId="test-case" />);
    fireEvent.click(screen.getByTestId('aiSummaryButton'));
    expect(refetchMock).toHaveBeenCalled();
  });

  it('returns null if license is not atleast enterprise', () => {
    useLicenseMock.mockReturnValue({
      isAtLeastEnterprise: () => false,
    });
    renderWithTestingProviders(<CaseSummary caseId="test-case" />);
    expect(screen.queryByText('Case summary')).not.toBeInTheDocument();
  });

  it('returns null if connectorId is missing', () => {
    useGetInferenceConnectorsMock.mockReturnValue({
      data: { connectors: [] },
    });
    renderWithTestingProviders(<CaseSummary caseId="test-case" />);
    expect(screen.queryByText('Case summary')).not.toBeInTheDocument();
  });

  it('shows error message if error exists', () => {
    useGetCaseSummaryMock.mockReturnValue({
      data: undefined,
      error: new Error('Something went wrong'),
      refetch: jest.fn(),
    });

    renderWithTestingProviders(<CaseSummary caseId="test-case" />);
    expect(screen.getByText('Error fetching AI summary')).toBeInTheDocument();
  });
});
