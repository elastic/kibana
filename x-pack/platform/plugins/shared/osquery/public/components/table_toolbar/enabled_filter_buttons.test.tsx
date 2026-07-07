/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnabledFilterButtons } from './enabled_filter_buttons';
import type { EnabledFilter } from './enabled_filter_buttons';

const renderComponent = (props: Partial<{ value: EnabledFilter; onChange: jest.Mock }> = {}) => {
  const defaultProps = {
    value: undefined as EnabledFilter,
    onChange: jest.fn(),
    ...props,
  };

  return { ...render(React.createElement(EnabledFilterButtons, defaultProps)), ...defaultProps };
};

describe('EnabledFilterButtons', () => {
  it('renders enabled and disabled buttons', () => {
    renderComponent();

    expect(screen.getByTestId('enabled-filter-enabled')).toBeInTheDocument();
    expect(screen.getByTestId('enabled-filter-disabled')).toBeInTheDocument();
  });

  it('calls onChange with "true" when enabled button is clicked and no filter is active', () => {
    const { onChange } = renderComponent({ value: undefined });

    fireEvent.click(screen.getByTestId('enabled-filter-enabled'));

    expect(onChange).toHaveBeenCalledWith('true');
  });

  it('calls onChange with undefined when enabled button is clicked and enabled filter is active (toggle off)', () => {
    const { onChange } = renderComponent({ value: 'true' });

    fireEvent.click(screen.getByTestId('enabled-filter-enabled'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onChange with "false" when disabled button is clicked and no filter is active', () => {
    const { onChange } = renderComponent({ value: undefined });

    fireEvent.click(screen.getByTestId('enabled-filter-disabled'));

    expect(onChange).toHaveBeenCalledWith('false');
  });

  it('calls onChange with undefined when disabled button is clicked and disabled filter is active (toggle off)', () => {
    const { onChange } = renderComponent({ value: 'false' });

    fireEvent.click(screen.getByTestId('enabled-filter-disabled'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onChange with "true" when switching from disabled to enabled', () => {
    const { onChange } = renderComponent({ value: 'false' });

    fireEvent.click(screen.getByTestId('enabled-filter-enabled'));

    expect(onChange).toHaveBeenCalledWith('true');
  });

  it('uses custom data-test-subj prefix', () => {
    render(
      React.createElement(EnabledFilterButtons, {
        value: undefined,
        onChange: jest.fn(),
        'data-test-subj': 'packs-status',
      })
    );

    expect(screen.getByTestId('packs-status-enabled')).toBeInTheDocument();
    expect(screen.getByTestId('packs-status-disabled')).toBeInTheDocument();
  });
});
