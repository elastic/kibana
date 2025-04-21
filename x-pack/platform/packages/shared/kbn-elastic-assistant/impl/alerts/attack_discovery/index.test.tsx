/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttackDiscoveryWidget } from '.';
import { useAssistantContext } from '../../assistant_context';
import { useFetchAttackDiscovery } from './use_fetch_attack_discovery';
import * as i18n from './translations';

// Mock the custom hooks
jest.mock('../../assistant_context', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('./use_fetch_attack_discovery', () => ({
  useFetchAttackDiscovery: jest.fn(),
}));
const mockData = {
  alertIds: ['alert-id-xyz789'],
  detailsMarkdown: `
* Suspicious process \`process.name\`:\`rundll32.exe\` launched by \`process.parent.name\`:\`winword.exe\` on \`host.name\`:\`finance-ws-03\`.
* Network connection initiated by \`process.name\`:\`rundll32.exe\` to \`destination.ip\`:\`203.0.113.25\` on \`destination.port\`:\`443\`.
  `,
  mitreAttackTactics: ['TA0002', 'TA0011'],
  summaryMarkdown:
    'Possible command and control activity initiated by `process.name`:`rundll32.exe` originating from `process.parent.name`:`winword.exe` on host `host.name`:`finance-ws-03`.',
  title: 'Suspicious Rundll32 Network Activity',
};
describe('AttackDiscoveryWidget', () => {
  const mockNavigateToApp = jest.fn();
  const mockHttp = {};
  const mockToasts = {};

  beforeEach(() => {
    jest.clearAllMocks();

    (useAssistantContext as jest.Mock).mockReturnValue({
      http: mockHttp,
      toasts: mockToasts,
      navigateToApp: mockNavigateToApp,
    });
  });

  it('renders loading spinner when data is being fetched', () => {
    (useFetchAttackDiscovery as jest.Mock).mockReturnValue({
      isFetching: true,
      data: null,
    });

    render(<AttackDiscoveryWidget />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders no results message when no data is available', () => {
    (useFetchAttackDiscovery as jest.Mock).mockReturnValue({
      isFetching: false,
      data: null,
    });

    render(<AttackDiscoveryWidget />);

    expect(screen.getByText(i18n.NO_RESULTS)).toBeInTheDocument();
  });

  it('renders attack discovery details when data is available', () => {
    (useFetchAttackDiscovery as jest.Mock).mockReturnValue({
      isFetching: false,
      data: mockData,
    });

    render(<AttackDiscoveryWidget />);

    expect(screen.getByText(mockData.title)).toBeInTheDocument();
    expect(screen.getByTestId('alertsBadge')).toHaveTextContent('1');
  });

  it('navigates to attack discovery page when "View Details" button is clicked', () => {
    (useFetchAttackDiscovery as jest.Mock).mockReturnValue({
      isFetching: false,
      data: mockData,
    });

    render(<AttackDiscoveryWidget />);

    fireEvent.click(screen.getByTestId('attackDiscoveryViewDetails'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('security', {
      path: 'attack_discovery',
    });
  });
});
