/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';

import { IntegrationCountBadge } from './integration_count_badge';

// Mock the useCloudConnectorUsage hook
jest.mock('../hooks/use_cloud_connector_usage', () => ({
  useCloudConnectorUsage: jest.fn(),
}));

const mockUseCloudConnectorUsage = useCloudConnectorUsage as jest.MockedFunction<
  typeof useCloudConnectorUsage
>;

// EuiToolTip has a 250ms delay for "long" - we need fake timers
const TOOLTIP_DELAY_MS = 300;

describe('IntegrationCountBadge', () => {
  const renderBadge = (cloudConnectorId: string, count: number) => {
    return render(
      <I18nProvider>
        <IntegrationCountBadge cloudConnectorId={cloudConnectorId} count={count} />
      </I18nProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCloudConnectorUsage>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('badge rendering', () => {
    it('renders badge with singular text for count of 1', () => {
      renderBadge('connector-1', 1);
      expect(screen.getByText('Used by 1 integration')).toBeInTheDocument();
    });

    it('renders badge with plural text for count greater than 1', () => {
      renderBadge('connector-1', 3);
      expect(screen.getByText('Used by 3 integrations')).toBeInTheDocument();
    });

    it('renders badge with plural text for count of 0', () => {
      renderBadge('connector-1', 0);
      expect(screen.getByText('Used by 0 integrations')).toBeInTheDocument();
    });
  });

  describe('tooltip behavior', () => {
    it('does not wrap badge with tooltip when count is 0', () => {
      const { container } = renderBadge('connector-1', 0);
      // Should not have EuiToolTip wrapper (no mouse event handlers for tooltip)
      const badge = container.querySelector('.euiBadge');
      expect(badge).toBeInTheDocument();
      // The parent should not be a tooltip anchor
      expect(badge?.parentElement?.getAttribute('aria-describedby')).toBeNull();
    });

    it('wraps badge with tooltip when count is greater than 0', async () => {
      mockUseCloudConnectorUsage.mockReturnValue({
        data: {
          items: [
            {
              id: 'policy-1',
              name: 'Policy 1',
              policy_ids: ['agent-1'],
              created_at: '',
              updated_at: '',
            },
          ],
          total: 1,
          page: 1,
          perPage: 10,
        },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useCloudConnectorUsage>);

      const { container } = renderBadge('connector-1', 1);
      const badge = container.querySelector('.euiBadge');
      expect(badge).toBeInTheDocument();

      // Trigger hover on the tooltip anchor (EuiToolTip's wrapper)
      const tooltipAnchor = container.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(tooltipAnchor!);

      // Advance past the tooltip delay
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_DELAY_MS);
      });

      // Wait for tooltip to appear
      await waitFor(() => {
        expect(screen.getByText('Policy 1')).toBeInTheDocument();
      });
    });
  });

  describe('tooltip content states', () => {
    it('shows loading spinner when data is loading', async () => {
      mockUseCloudConnectorUsage.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as ReturnType<typeof useCloudConnectorUsage>);

      const { container } = renderBadge('connector-1', 2);

      // Trigger hover on the tooltip anchor
      const tooltipAnchor = container.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(tooltipAnchor!);

      // Advance past the tooltip delay
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_DELAY_MS);
      });

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('shows error message when there is an error', async () => {
      mockUseCloudConnectorUsage.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as ReturnType<typeof useCloudConnectorUsage>);

      const { container } = renderBadge('connector-1', 2);

      // Trigger hover on the tooltip anchor
      const tooltipAnchor = container.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(tooltipAnchor!);

      // Advance past the tooltip delay
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_DELAY_MS);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load integrations')).toBeInTheDocument();
      });
    });

    it('shows policy names when data is loaded', async () => {
      mockUseCloudConnectorUsage.mockReturnValue({
        data: {
          items: [
            {
              id: 'policy-1',
              name: 'CSPM Policy',
              policy_ids: ['agent-1'],
              created_at: '',
              updated_at: '',
            },
            {
              id: 'policy-2',
              name: 'Asset Inventory',
              policy_ids: ['agent-2'],
              created_at: '',
              updated_at: '',
            },
          ],
          total: 2,
          page: 1,
          perPage: 10,
        },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useCloudConnectorUsage>);

      const { container } = renderBadge('connector-1', 2);

      // Trigger hover on the tooltip anchor
      const tooltipAnchor = container.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(tooltipAnchor!);

      // Advance past the tooltip delay
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_DELAY_MS);
      });

      await waitFor(() => {
        expect(screen.getByText('CSPM Policy')).toBeInTheDocument();
        expect(screen.getByText('Asset Inventory')).toBeInTheDocument();
      });
    });

    it('shows "+X more" when there are more policies than displayed', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `policy-${i}`,
        name: `Policy ${i + 1}`,
        policy_ids: [`agent-${i}`],
        created_at: '',
        updated_at: '',
      }));

      mockUseCloudConnectorUsage.mockReturnValue({
        data: {
          items,
          total: 15, // 5 more than displayed
          page: 1,
          perPage: 10,
        },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useCloudConnectorUsage>);

      const { container } = renderBadge('connector-1', 15);

      // Trigger hover on the tooltip anchor
      const tooltipAnchor = container.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(tooltipAnchor!);

      // Advance past the tooltip delay
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_DELAY_MS);
      });

      await waitFor(() => {
        expect(screen.getByText('+5 more')).toBeInTheDocument();
      });
    });
  });

  describe('hook options', () => {
    it('calls useCloudConnectorUsage with staleTime: 0 for fresh data on hover', async () => {
      mockUseCloudConnectorUsage.mockReturnValue({
        data: {
          items: [
            {
              id: 'policy-1',
              name: 'Test Policy',
              policy_ids: ['agent-1'],
              created_at: '',
              updated_at: '',
            },
          ],
          total: 1,
          page: 1,
          perPage: 10,
        },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useCloudConnectorUsage>);

      const { container } = renderBadge('connector-123', 1);

      // Trigger hover on the tooltip anchor
      const tooltipAnchor = container.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(tooltipAnchor!);

      // Advance past the tooltip delay
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_DELAY_MS);
      });

      await waitFor(() => {
        // Verify the hook is called with the correct parameters including staleTime: 0
        expect(mockUseCloudConnectorUsage).toHaveBeenCalledWith('connector-123', 1, 10, {
          staleTime: 0,
        });
      });
    });
  });
});
