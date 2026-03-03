/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryTypeField } from './recovery_type_field';
import { createFormWrapper } from '../../test_utils';

describe('RecoveryTypeField', () => {
  it('renders the recovery label', () => {
    render(<RecoveryTypeField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Recovery')).toBeInTheDocument();
  });

  it('renders a select input', () => {
    render(<RecoveryTypeField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('recoveryTypeSelect')).toBeInTheDocument();
  });

  it('renders both recovery type options', () => {
    render(<RecoveryTypeField />, { wrapper: createFormWrapper() });

    const select = screen.getByTestId('recoveryTypeSelect');
    const options = select.querySelectorAll('option');

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Alert condition is no longer met');
    expect(options[1]).toHaveTextContent('Recovery condition is met [ES|QL query]');
  });

  it('selects no_breach by default', () => {
    render(<RecoveryTypeField />, {
      wrapper: createFormWrapper({ recoveryPolicy: { type: 'no_breach' } }),
    });

    const select = screen.getByTestId('recoveryTypeSelect') as HTMLSelectElement;
    expect(select.value).toBe('no_breach');
  });

  it('selects query when recoveryPolicy type is query', () => {
    render(<RecoveryTypeField />, {
      wrapper: createFormWrapper({ recoveryPolicy: { type: 'query' } }),
    });

    const select = screen.getByTestId('recoveryTypeSelect') as HTMLSelectElement;
    expect(select.value).toBe('query');
  });

  it('updates value when user selects a different option', () => {
    render(<RecoveryTypeField />, {
      wrapper: createFormWrapper({ recoveryPolicy: { type: 'no_breach' } }),
    });

    const select = screen.getByTestId('recoveryTypeSelect') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'query' } });

    expect(select.value).toBe('query');
  });

  it('updates value back to no_breach', () => {
    render(<RecoveryTypeField />, {
      wrapper: createFormWrapper({ recoveryPolicy: { type: 'query' } }),
    });

    const select = screen.getByTestId('recoveryTypeSelect') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'no_breach' } });

    expect(select.value).toBe('no_breach');
  });
});
