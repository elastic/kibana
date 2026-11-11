/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualOptionsProps } from './value_labels_settings';
import { ValueLabelsSettings } from './value_labels_settings';

describe('Value labels Settings', () => {
  let props: VisualOptionsProps;
  beforeEach(() => {
    props = {
      onValueLabelChange: jest.fn(),
    };
  });

  it('should not render the component if not enabled', () => {
    render(<ValueLabelsSettings {...props} isVisible={false} />);
    expect(screen.queryByTestId('lens-value-labels-visibility-btn')).not.toBeInTheDocument();
  });

  it('should set hide as default value', () => {
    render(<ValueLabelsSettings {...props} />);
    const control = within(screen.getByTestId('lens-value-labels-visibility-btn'));
    expect(control.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('should have called onValueLabelChange function on ButtonGroup change', async () => {
    render(<ValueLabelsSettings {...props} />);
    const control = within(screen.getByTestId('lens-value-labels-visibility-btn'));
    await userEvent.click(control.getByRole('button', { name: 'Show, if able' }));
    expect(props.onValueLabelChange).toHaveBeenCalledWith('show');
  });

  it('should render the passed value if given', () => {
    render(<ValueLabelsSettings {...props} valueLabels="show" />);
    const control = within(screen.getByTestId('lens-value-labels-visibility-btn'));
    expect(control.getByRole('button', { name: 'Show, if able' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
