/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentModeSelector } from './agent_mode_selector';

describe('AgentModeSelector', () => {
  const defaultProps = {
    agentMode: 'agent' as const,
    onModeChange: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the mode selector', () => {
    render(<AgentModeSelector {...defaultProps} />);
    expect(screen.getByTestId('agentBuilderModeSelector')).toBeInTheDocument();
  });

  it('renders Agent and Plan options', () => {
    render(<AgentModeSelector {...defaultProps} />);
    expect(screen.getByTestId('agentBuilderModeAgent')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderModePlanning')).toBeInTheDocument();
  });

  it('calls onModeChange when Plan is clicked', () => {
    render(<AgentModeSelector {...defaultProps} />);
    fireEvent.click(screen.getByTestId('agentBuilderModePlanning'));
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('planning');
  });

  it('calls onModeChange when Agent is clicked', () => {
    render(<AgentModeSelector {...defaultProps} agentMode="planning" />);
    fireEvent.click(screen.getByTestId('agentBuilderModeAgent'));
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('agent');
  });

  it('disables the selector when disabled is true', () => {
    render(<AgentModeSelector {...defaultProps} disabled />);
    const agentButton = screen.getByTestId('agentBuilderModeAgent');
    expect(agentButton).toBeDisabled();
  });
});
