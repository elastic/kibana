/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderReactTestingLibraryWithI18n } from '@kbn/test-jest-helpers';
import type { Agent } from '../../../../types';
import { useStartServices } from '../../../../hooks';

import { AgentDetailsJsonFlyout } from './agent_details_json_flyout';

jest.mock('../../../../hooks');

const mockUseStartServices = useStartServices as jest.Mock;

describe('AgentDetailsJsonFlyout', () => {
  const agent: Agent = {
    id: '123',
    packages: [],
    type: 'PERMANENT',
    active: true,
    enrolled_at: `${Date.now()}`,
    user_provided_metadata: {},
    local_metadata: {},
  };

  beforeEach(() => {
    mockUseStartServices.mockReturnValue({
      docLinks: { links: { fleet: { troubleshooting: 'https://elastic.co' } } },
    });
  });

  const renderComponent = () => {
    return renderReactTestingLibraryWithI18n(
      <AgentDetailsJsonFlyout agent={agent} onClose={jest.fn()} />
    );
  };

  it('renders a title with the agent id if host name is not defined', () => {
    const result = renderComponent();
    expect(result.getByText("'123' agent details")).toBeInTheDocument();
  });

  it('renders a title with the agent host name if defined', () => {
    agent.local_metadata = {
      host: {
        hostname: '456',
      },
    };
    const result = renderComponent();
    expect(result.getByText("'456' agent details")).toBeInTheDocument();
  });

  it('does not add a link to the page after clicking Download', () => {
    const result = renderComponent();
    const downloadButton = result.getByRole('button', { name: 'Download JSON' });
    const anchorMocked = {
      href: '',
      click: jest.fn(),
      download: '',
      setAttribute: jest.fn(),
    } as any;
    const createElementSpyOn = jest
      .spyOn(document, 'createElement')
      .mockReturnValueOnce(anchorMocked);

    downloadButton.click();
    expect(createElementSpyOn).toBeCalledWith('a');
    expect(result.queryAllByRole('link')).toHaveLength(1); // The only link is the one from the flyout's description.
    expect(result.getByRole('link')).toHaveAttribute('href', 'https://elastic.co');
  });
});
