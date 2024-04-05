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
  const allow = Array.from({ length: 20 }, (_, i) => `field${i + 1}`);
  const anonymizationFields = {
    total: 20,
    page: 1,
    perPage: 100,
    data: allow.map((f) => ({ id: f, field: f, allowed: true, anonymized: f === 'field1' })),
  };
  const rawData = allow.reduce(
    (acc, field, index) => ({ ...acc, [field]: [`value${index + 1}`] }),
    {}
  );

  const onListUpdated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <ContextEditor
        anonymizationFields={anonymizationFields}
        onListUpdated={onListUpdated}
        rawData={rawData}
      />
    );
  });

  it('renders the expected selected field count', () => {
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 0 fields');
  });

  it('renders the select all fields button with the expected count', () => {
    expect(screen.getByTestId('selectAllFields')).toHaveTextContent('Select all 20 fields');
  });

  it('updates the table selection when "Select all n fields" is clicked', () => {
    // The table select all checkbox should only select the number of rows visible on the page
    userEvent.click(screen.getByTestId('checkboxSelectAll'));
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 10 fields');

    // The select all button should select all rows regardless of visibility
    userEvent.click(screen.getByTestId('selectAllFields'));
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 20 fields');
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
