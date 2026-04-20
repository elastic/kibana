/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SuggestedAction } from '@kbn/agent-builder-common';
import { SuggestedActions } from './suggested_actions';

const mockSendMessage = jest.fn();
jest.mock('../../../../context/send_message/send_message_context', () => ({
  useSendMessage: () => ({
    sendMessage: mockSendMessage,
    isResponseLoading: false,
  }),
}));

const mockPrepend = jest.fn((path: string) => `/base${path}`);
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: { prepend: mockPrepend },
      },
    },
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        size: { xs: '4px' },
        border: {
          thin: '1px solid #D3DAE6',
          radius: { medium: '6px' },
        },
      },
    }),
  };
});

describe('SuggestedActions', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockPrepend.mockClear();
  });

  it('renders nothing when actions array is empty', () => {
    const { container } = render(<SuggestedActions actions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders action buttons for each suggested action', () => {
    const actions: SuggestedAction[] = [
      { label: 'Save as dashboard', prompt: 'Save this as a new dashboard' },
      { label: 'Show last 7 days', prompt: 'Show the same metrics for the last 7 days' },
    ];

    render(<SuggestedActions actions={actions} />);

    expect(screen.getByText('Save as dashboard')).toBeInTheDocument();
    expect(screen.getByText('Show last 7 days')).toBeInTheDocument();
  });

  it('sends the prompt when a prompt action is clicked', () => {
    const actions: SuggestedAction[] = [
      { label: 'Investigate errors', prompt: 'Investigate the 503 errors on this host' },
    ];

    render(<SuggestedActions actions={actions} />);

    fireEvent.click(screen.getByText('Investigate errors'));

    expect(mockSendMessage).toHaveBeenCalledWith({
      message: 'Investigate the 503 errors on this host',
    });
  });

  it('renders with the test subject attribute', () => {
    const actions: SuggestedAction[] = [{ label: 'Action 1', prompt: 'prompt 1' }];

    render(<SuggestedActions actions={actions} />);

    expect(screen.getByTestId('suggestedActions')).toBeInTheDocument();
    expect(screen.getByTestId('suggestedAction-0')).toBeInTheDocument();
  });

  describe('navigation actions', () => {
    it('renders a navigation action as a link with href and target="_blank"', () => {
      const actions: SuggestedAction[] = [
        {
          label: 'Open dashboard',
          prompt: 'Open the dashboard',
          url: '/app/dashboards#/view/abc-123',
        },
      ];

      render(<SuggestedActions actions={actions} />);

      const link = screen.getByTestId('suggestedAction-0');
      expect(link).toHaveAttribute('href', '/base/app/dashboards#/view/abc-123');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('does not call sendMessage when a navigation action is clicked', () => {
      const actions: SuggestedAction[] = [
        {
          label: 'Open dashboard',
          prompt: 'Open the dashboard',
          url: '/app/dashboards#/view/abc-123',
        },
      ];

      render(<SuggestedActions actions={actions} />);

      fireEvent.click(screen.getByText('Open dashboard'));

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('renders a popout icon for navigation actions', () => {
      const actions: SuggestedAction[] = [
        {
          label: 'Open dashboard',
          prompt: 'Open the dashboard',
          url: '/app/dashboards#/view/abc-123',
        },
      ];

      const { container } = render(<SuggestedActions actions={actions} />);

      const popoutIcon = container.querySelector('[data-euiicon-type="popout"]');
      expect(popoutIcon).toBeInTheDocument();
    });

    it('renders mixed prompt and navigation actions', () => {
      const actions: SuggestedAction[] = [
        { label: 'Ask more', prompt: 'Tell me more about this' },
        {
          label: 'View in Discover',
          prompt: 'Open Discover',
          url: '/app/discover',
        },
      ];

      render(<SuggestedActions actions={actions} />);

      const promptButton = screen.getByText('Ask more');
      const navButton = screen.getByText('View in Discover');

      expect(promptButton.closest('a')).toBeNull();
      expect(navButton.closest('a')).toHaveAttribute('href', '/base/app/discover');
    });
  });

  describe('max visible limit and prioritization', () => {
    it('shows at most 3 actions', () => {
      const actions: SuggestedAction[] = [
        { label: 'Action 1', prompt: 'p1' },
        { label: 'Action 2', prompt: 'p2' },
        { label: 'Action 3', prompt: 'p3' },
        { label: 'Action 4', prompt: 'p4' },
      ];

      render(<SuggestedActions actions={actions} />);

      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
      expect(screen.getByText('Action 3')).toBeInTheDocument();
      expect(screen.queryByText('Action 4')).not.toBeInTheDocument();
    });

    it('prioritizes navigation actions over prompt actions', () => {
      const actions: SuggestedAction[] = [
        { label: 'Prompt 1', prompt: 'p1' },
        { label: 'Prompt 2', prompt: 'p2' },
        { label: 'Prompt 3', prompt: 'p3' },
        { label: 'Open dashboard', prompt: 'fallback', url: '/app/dashboards#/view/abc' },
      ];

      render(<SuggestedActions actions={actions} />);

      expect(screen.getByText('Open dashboard')).toBeInTheDocument();
      expect(screen.getByText('Prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Prompt 2')).toBeInTheDocument();
      expect(screen.queryByText('Prompt 3')).not.toBeInTheDocument();
    });

    it('renders all actions when 3 or fewer', () => {
      const actions: SuggestedAction[] = [
        { label: 'A', prompt: 'p1' },
        { label: 'B', prompt: 'p2', url: '/app/discover' },
      ];

      render(<SuggestedActions actions={actions} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });
});
