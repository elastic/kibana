/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { TransformSelectorControlProps } from './transform_selector_control';
import { TransformSelectorControl } from './transform_selector_control';

describe('TransformSelectorControl', () => {
  const defaultProps: TransformSelectorControlProps = {
    label: 'Select Transforms',
    errors: [],
    onChange: jest.fn(),
    selectedOptions: [],
    options: ['transform1', 'transform2'],
    allowSelectAll: true,
  };

  it('renders without crashing', () => {
    const { getByLabelText } = render(<TransformSelectorControl {...defaultProps} />);
    expect(getByLabelText('Select Transforms')).toBeInTheDocument();
  });

  it('displays options correctly', () => {
    const { getByText } = render(<TransformSelectorControl {...defaultProps} />);
    fireEvent.click(getByText('Select Transforms'));
    expect(getByText('transform1')).toBeInTheDocument();
    expect(getByText('transform2')).toBeInTheDocument();
    expect(getByText('*')).toBeInTheDocument();
  });

  it('calls onChange with selected options', () => {
    const { getByText } = render(<TransformSelectorControl {...defaultProps} />);
    fireEvent.click(getByText('Select Transforms'));
    fireEvent.click(getByText('transform1'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(['transform1']);
  });

  it('only allows wildcards as custom options', () => {
    const { getByText, getByTestId } = render(<TransformSelectorControl {...defaultProps} />);
    fireEvent.click(getByText('Select Transforms'));
    const input = getByTestId('comboBoxSearchInput');

    fireEvent.change(input, { target: { value: 'custom' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(defaultProps.onChange).not.toHaveBeenCalledWith(['custom']);

    fireEvent.change(input, { target: { value: 'custom*' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(defaultProps.onChange).toHaveBeenCalledWith(['custom*']);
  });

  it('displays errors correctly', () => {
    const errorProps = { ...defaultProps, errors: ['Error message'] };
    const { getByText } = render(<TransformSelectorControl {...errorProps} />);
    expect(getByText('Error message')).toBeInTheDocument();
  });
});
