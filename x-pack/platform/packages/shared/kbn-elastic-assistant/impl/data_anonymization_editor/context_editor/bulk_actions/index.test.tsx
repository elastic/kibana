/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BulkActions } from '.';

const selected = [
  {
    allowed: true,
    anonymized: false,
    denied: false,
    field: 'process.args',
    rawValues: ['abc', 'def'],
  },
  {
    allowed: false,
    anonymized: true,
    denied: true,
    field: 'user.name',
    rawValues: ['fooUser'],
  },
];

const defaultProps = {
  appliesTo: 'multipleRows' as const,
  disabled: false,
  onListUpdated: jest.fn(),
  onlyDefaults: false,
  selected,
};

describe('BulkActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls onListUpdated with the expected updates when Allow is clicked', async () => {
    const { getByTestId, getByText } = render(<BulkActions {...defaultProps} />);

    await userEvent.click(getByTestId('bulkActionsButton'));
    fireEvent.click(getByText(/^Allow$/));

    expect(defaultProps.onListUpdated).toBeCalledWith([
      { field: 'process.args', operation: 'add', update: 'allow' },
      { field: 'user.name', operation: 'add', update: 'allow' },
    ]);
  });

  it('calls onListUpdated with the expected updates when Deny is clicked', async () => {
    const { getByTestId, getByText } = render(<BulkActions {...defaultProps} />);

    await userEvent.click(getByTestId('bulkActionsButton'));
    fireEvent.click(getByText(/^Deny$/));

    expect(defaultProps.onListUpdated).toBeCalledWith([
      { field: 'process.args', operation: 'remove', update: 'allow' },
      { field: 'user.name', operation: 'remove', update: 'allow' },
    ]);
  });

  it('calls onListUpdated with the expected updates when Anonymize is clicked', async () => {
    const { getByTestId, getByText } = render(<BulkActions {...defaultProps} />);

    await userEvent.click(getByTestId('bulkActionsButton'));
    fireEvent.click(getByText(/^Anonymize$/));

    expect(defaultProps.onListUpdated).toBeCalledWith([
      { field: 'process.args', operation: 'add', update: 'allowReplacement' },
      { field: 'user.name', operation: 'add', update: 'allowReplacement' },
    ]);
  });

  it('calls onListUpdated with the expected updates when Unanonymize is clicked', async () => {
    const { getByTestId, getByText } = render(<BulkActions {...defaultProps} />);

    await userEvent.click(getByTestId('bulkActionsButton'));
    fireEvent.click(getByText(/^Unanonymize$/));

    expect(defaultProps.onListUpdated).toBeCalledWith([
      { field: 'process.args', operation: 'remove', update: 'allowReplacement' },
      { field: 'user.name', operation: 'remove', update: 'allowReplacement' },
    ]);
  });
});
