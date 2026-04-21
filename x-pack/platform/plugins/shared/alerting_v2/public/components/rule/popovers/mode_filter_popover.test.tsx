/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeFilterPopover } from './mode_filter_popover';

const defaultProps = {
  value: '',
  onChange: jest.fn(),
};

describe('ModeFilterPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Mode filter button', () => {
    render(<ModeFilterPopover {...defaultProps} />);

    expect(screen.getByTestId('rulesListModeFilter')).toBeInTheDocument();
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('displays Alerting and Detect only options when opened', () => {
    render(<ModeFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListModeFilter'));

    expect(screen.getByText('Alerting')).toBeInTheDocument();
    expect(screen.getByText('Detect only')).toBeInTheDocument();
  });

  it('calls onChange with "alert" when Alerting is selected', () => {
    const onChange = jest.fn();
    render(<ModeFilterPopover value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListModeFilter'));
    fireEvent.click(screen.getByText('Alerting'));

    expect(onChange).toHaveBeenCalledWith('alert');
  });

  it('calls onChange with "signal" when Detect only is selected', () => {
    const onChange = jest.fn();
    render(<ModeFilterPopover value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListModeFilter'));
    fireEvent.click(screen.getByText('Detect only'));

    expect(onChange).toHaveBeenCalledWith('signal');
  });

  it('calls onChange with empty string when the active filter is deselected', () => {
    const onChange = jest.fn();
    render(<ModeFilterPopover value="alert" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListModeFilter'));
    fireEvent.click(screen.getByText('Alerting'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows active filter count when a value is selected', () => {
    render(<ModeFilterPopover value="signal" onChange={jest.fn()} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
