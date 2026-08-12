/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ResultsTable } from './results_table';
import { useKibana } from '../common/lib/kibana';

jest.mock('../common/lib/kibana');
jest.mock('./unified_results_table', () => ({
  UnifiedResultsTable: () => <div data-test-subj="unifiedResultsTable">Unified Table</div>,
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockUiActions = { getTriggerCompatibleActions: jest.fn() };
const mockUnifiedSearch = { ui: { SearchBar: () => null } };

const mockServices = (services: Record<string, unknown>) =>
  useKibanaMock.mockReturnValue({ services } as unknown as ReturnType<typeof useKibana>);

describe('ResultsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the unified table when uiActions and unifiedSearch are available', () => {
    mockServices({ uiActions: mockUiActions, unifiedSearch: mockUnifiedSearch });

    render(<ResultsTable actionId="test-action" />);

    expect(screen.getByTestId('unifiedResultsTable')).toBeInTheDocument();
  });

  it('should render nothing when uiActions is unavailable', () => {
    mockServices({ unifiedSearch: mockUnifiedSearch });

    const { container } = render(<ResultsTable actionId="test-action" />);

    expect(screen.queryByTestId('unifiedResultsTable')).not.toBeInTheDocument();
    // Nothing at all: no fallback, error state or partial UI.
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when unifiedSearch is unavailable', () => {
    mockServices({ uiActions: mockUiActions });

    const { container } = render(<ResultsTable actionId="test-action" />);

    expect(screen.queryByTestId('unifiedResultsTable')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when both optional plugins are unavailable', () => {
    mockServices({});

    const { container } = render(<ResultsTable actionId="test-action" />);

    expect(screen.queryByTestId('unifiedResultsTable')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
