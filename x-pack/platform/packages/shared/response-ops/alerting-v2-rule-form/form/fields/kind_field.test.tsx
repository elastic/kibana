/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KindField } from './kind_field';
import { createFormWrapper } from '../../test_utils';

describe('KindField', () => {
  it('renders the rule kind label', () => {
    render(<KindField />, { wrapper: createFormWrapper() });

    // "Rule kind" appears twice (form label + button group legend), so use getAllByText
    expect(screen.getAllByText('Rule kind')).toHaveLength(2);
  });

  it('renders help text', () => {
    render(<KindField />, { wrapper: createFormWrapper() });

    expect(
      screen.getByText('Choose whether this rule creates monitors or alerts.')
    ).toBeInTheDocument();
  });

  it('renders Alert and Monitor options', () => {
    render(<KindField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });

  it('selects Alert by default', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    const alertButton = screen.getByText('Alert').closest('button');
    expect(alertButton).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('selects Monitor when kind is signal', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'signal' }) });

    const monitorButton = screen.getByText('Monitor').closest('button');
    expect(monitorButton).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('updates value when user clicks Monitor', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'alert' }) });

    const monitorButton = screen.getByText('Monitor');
    fireEvent.click(monitorButton);

    expect(monitorButton.closest('button')).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('updates value when user clicks Alert', () => {
    render(<KindField />, { wrapper: createFormWrapper({ kind: 'signal' }) });

    const alertButton = screen.getByText('Alert');
    fireEvent.click(alertButton);

    expect(alertButton.closest('button')).toHaveClass('euiButtonGroupButton-isSelected');
  });
});
