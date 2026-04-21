/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusFilterPopover } from './status_filter_popover';

const defaultProps = {
  value: '',
  onChange: jest.fn(),
};

describe('StatusFilterPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Status filter button', () => {
    render(<StatusFilterPopover {...defaultProps} />);

    expect(screen.getByTestId('rulesListStatusFilter')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('displays Enabled and Disabled options when opened', () => {
    render(<StatusFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListStatusFilter'));

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('calls onChange with "true" when Enabled is selected', () => {
    const onChange = jest.fn();
    render(<StatusFilterPopover value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListStatusFilter'));
    fireEvent.click(screen.getByText('Enabled'));

    expect(onChange).toHaveBeenCalledWith('true');
  });

  it('calls onChange with "false" when Disabled is selected', () => {
    const onChange = jest.fn();
    render(<StatusFilterPopover value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListStatusFilter'));
    fireEvent.click(screen.getByText('Disabled'));

    expect(onChange).toHaveBeenCalledWith('false');
  });

  it('calls onChange with empty string when the active filter is deselected', () => {
    const onChange = jest.fn();
    render(<StatusFilterPopover value="true" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListStatusFilter'));
    fireEvent.click(screen.getByText('Enabled'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows active filter count when a value is selected', () => {
    render(<StatusFilterPopover value="true" onChange={jest.fn()} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
