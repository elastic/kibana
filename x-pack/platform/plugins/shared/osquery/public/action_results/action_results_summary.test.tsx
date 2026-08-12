/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ActionResultsSummary } from './action_results_summary';
import { useKibana } from '../common/lib/kibana';

jest.mock('../common/lib/kibana');
jest.mock('./unified_action_results_summary', () => ({
  UnifiedActionResultsSummary: () => (
    <div data-test-subj="unifiedActionResultsSummary">Unified Table</div>
  ),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockUiActions = { getTriggerCompatibleActions: jest.fn() };

const mockServices = (services: Record<string, unknown>) =>
  useKibanaMock.mockReturnValue({ services } as unknown as ReturnType<typeof useKibana>);

describe('ActionResultsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the unified table when uiActions is available', () => {
    mockServices({ uiActions: mockUiActions });

    render(<ActionResultsSummary actionId="test-action" agentIds={['agent-1']} />);

    expect(screen.getByTestId('unifiedActionResultsSummary')).toBeInTheDocument();
  });

  it('should render nothing when uiActions is unavailable', () => {
    mockServices({});

    const { container } = render(
      <ActionResultsSummary actionId="test-action" agentIds={['agent-1']} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
