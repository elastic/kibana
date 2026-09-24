/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { McpClientDetailsContent } from './mcp_client_details_content';
import { labels } from './translations';

describe.each(['modal', 'flyout'] as const)('McpClientDetailsContent (%s)', (presentation) => {
  it.each([
    {
      resource: 'https://kibana.example.com',
      spaceId: 'default',
      expected: 'https://kibana.example.com/api/agent_builder/mcp',
    },
    {
      resource: 'https://kibana.example.com/',
      spaceId: 'engineering',
      expected: 'https://kibana.example.com/s/engineering/api/agent_builder/mcp',
    },
    {
      resource: 'https://kibana.example.com/kibana/',
      spaceId: 'engineering',
      expected: 'https://kibana.example.com/kibana/s/engineering/api/agent_builder/mcp',
    },
    {
      resource: 'https://kibana.example.com/kibana',
      spaceId: 'default',
      expected: 'https://kibana.example.com/kibana/api/agent_builder/mcp',
    },
    {
      resource: 'https://kibana.example.com/api/agent_builder/mcp',
      spaceId: 'engineering',
      expected: 'https://kibana.example.com/api/agent_builder/mcp',
    },
    {
      resource: 'https://kibana.example.com/kibana/s/other/api/agent_builder/mcp/',
      spaceId: 'engineering',
      expected: 'https://kibana.example.com/kibana/s/other/api/agent_builder/mcp/',
    },
    {
      resource: 'http://localhost:5601',
      spaceId: 'default',
      expected: 'http://localhost:5601/api/agent_builder/mcp',
    },
  ])('displays and copies $resource in $spaceId', ({ resource, spaceId, expected }) => {
    const clientDetails = Object.freeze({ id: 'client-id', resource });
    const originalExecCommand = document.execCommand;
    const execCommand = jest.fn(() => {
      expect(window.getSelection()?.toString()).toBe(expected);
      return true;
    });
    document.execCommand = execCommand;

    try {
      render(
        <McpClientDetailsContent
          clientDetails={clientDetails}
          spaceId={spaceId}
          presentation={presentation}
        />,
        { wrapper: EuiThemeProvider }
      );

      expect(screen.getByText(expected)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: labels.details.copyServerUrl }));
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(clientDetails.resource).toBe(resource);
    } finally {
      document.execCommand = originalExecCommand;
    }
  });
});
