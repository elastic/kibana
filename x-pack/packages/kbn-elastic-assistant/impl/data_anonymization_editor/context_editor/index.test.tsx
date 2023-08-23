/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ContextEditor } from '.';

describe('ContextEditor', () => {
  const allow = ['field1', 'field2'];
  const allowReplacement = ['field1'];
  const rawData = { field1: ['value1'], field2: ['value2'] };

  const onListUpdated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <ContextEditor
        allow={allow}
        allowReplacement={allowReplacement}
        onListUpdated={onListUpdated}
        rawData={rawData}
      />
    );
  });

  it('renders the expected selected field count', () => {
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 0 fields');
  });

  it('renders the select all fields button with the expected count', () => {
    expect(screen.getByTestId('selectAllFields')).toHaveTextContent('Select all 2 fields');
  });

  it('updates the table selection when "Select all n fields" is clicked', () => {
    userEvent.click(screen.getByTestId('selectAllFields'));

    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 2 fields');
  });

  it('calls onListUpdated with the expected values when the update button is clicked', () => {
    userEvent.click(screen.getAllByTestId('allowed')[0]);

    expect(onListUpdated).toHaveBeenCalledWith([
      {
        field: 'field1',
        operation: 'remove',
        update: 'allow',
      },
    ]);
  });
});
