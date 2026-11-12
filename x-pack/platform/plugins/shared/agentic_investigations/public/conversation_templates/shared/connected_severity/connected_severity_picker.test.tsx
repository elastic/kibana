/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ConnectedSeverityPicker } from './connected_severity_picker';

const mockMutate = jest.fn();
const mockAddDanger = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addDanger: mockAddDanger } } } }),
}));
jest.mock('../../../investigations/hooks/use_can_manage_investigations', () => ({
  useCanManageInvestigations: () => true,
}));
jest.mock('../../../investigations/hooks/use_investigation', () => ({
  useInvestigation: () => ({ data: { metadata: { severity: 'high' } } }),
}));
jest.mock('../../../investigations/hooks/use_investigations_api', () => ({
  useSetInvestigationSeverity: () => ({ mutate: mockMutate, isLoading: false }),
}));

const renderPicker = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConnectedSeverityPicker conversationId="c-1" severity="high" />
    </QueryClientProvider>
  );

const pick = () => {
  fireEvent.click(screen.getByTestId('connectedSeverityPicker'));
  fireEvent.click(screen.getByTestId('severityPickerOption-low'));
};

describe('ConnectedSeverityPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the picked severity while the request is still running', () => {
    renderPicker();

    pick();

    expect(screen.getByTestId('connectedSeverityPicker')).toHaveTextContent('Low');
  });

  it('reverts to the stored severity and reports it when the request fails', () => {
    renderPicker();
    pick();

    const [, { onError }] = mockMutate.mock.calls[0];
    act(() => onError());

    expect(screen.getByTestId('connectedSeverityPicker')).toHaveTextContent('High');
    expect(mockAddDanger).toHaveBeenCalledTimes(1);
  });
});
