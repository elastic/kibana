/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { AgentlessFilter } from './agentless_filter';

describe('AgentlessFilter', () => {
  const mockOnAgentlessFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with switch unchecked when agentlessFilter is false', () => {
    const { getByLabelText } = render(
      <AgentlessFilter
        agentlessFilter={false}
        onAgentlessFilterChange={mockOnAgentlessFilterChange}
      />
    );

    const switchElement = getByLabelText('Show agentless integrations only');
    expect(switchElement).toHaveProperty('checked', false);
  });

  it('should render with switch checked when agentlessFilter is true', () => {
    const { getByLabelText } = render(
      <AgentlessFilter
        agentlessFilter={true}
        onAgentlessFilterChange={mockOnAgentlessFilterChange}
      />
    );

    const switchElement = getByLabelText('Show agentless integrations only');
    expect(switchElement).toHaveProperty('checked', true);
  });

  it('should call onAgentlessFilterChange when switch is toggled', () => {
    const { getByLabelText } = render(
      <AgentlessFilter
        agentlessFilter={false}
        onAgentlessFilterChange={mockOnAgentlessFilterChange}
      />
    );

    const switchElement = getByLabelText('Show agentless integrations only');
    fireEvent.click(switchElement);

    expect(mockOnAgentlessFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnAgentlessFilterChange).toHaveBeenCalledWith(true);
  });

  it('should display tooltip with agentless explanation', () => {
    const { getByLabelText } = render(
      <AgentlessFilter
        agentlessFilter={false}
        onAgentlessFilterChange={mockOnAgentlessFilterChange}
      />
    );

    const tooltipIcon = getByLabelText('Info');
    expect(tooltipIcon).toBeDefined();
  });
});
