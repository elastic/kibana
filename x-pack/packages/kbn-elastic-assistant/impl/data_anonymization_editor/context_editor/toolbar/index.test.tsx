/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { Toolbar } from '.';
import * as i18n from '../translations';
import { ContextEditorRow } from '../types';

const selected: ContextEditorRow[] = [
  {
    allowed: true,
    anonymized: false,
    denied: false,
    field: 'event.action',
    rawValues: ['process_stopped', 'stop'],
  },
  {
    allowed: false,
    anonymized: false,
    denied: true,
    field: 'event.category',
    rawValues: ['process'],
  },
  {
    allowed: true,
    anonymized: true,
    denied: false,
    field: 'user.name',
    rawValues: ['max'],
  },
];

describe('Toolbar', () => {
  const defaultProps = {
    onListUpdated: jest.fn(),
    onlyDefaults: false,
    onReset: jest.fn(),
    onSelectAll: jest.fn(),
    selected: [], // no rows selected
    totalFields: 5,
  };

  it('displays the number of selected fields', () => {
    const { getByText } = render(<Toolbar {...defaultProps} selected={selected} />);

    const selectedCount = selected.length;
    const selectedFieldsText = getByText(i18n.SELECTED_FIELDS(selectedCount));

    expect(selectedFieldsText).toBeInTheDocument();
  });

  it('disables bulk actions when no rows are selected', () => {
    const { getByTestId } = render(<Toolbar {...defaultProps} />);

    const bulkActionsButton = getByTestId('bulkActionsButton');

    expect(bulkActionsButton).toBeDisabled();
  });

  it('enables bulk actions when some fields are selected', () => {
    const { getByTestId } = render(<Toolbar {...defaultProps} selected={selected} />);

    const bulkActionsButton = getByTestId('bulkActionsButton');

    expect(bulkActionsButton).not.toBeDisabled();
  });

  it('calls onSelectAll when the Select All Fields button is clicked', () => {
    const { getByText } = render(<Toolbar {...defaultProps} />);
    const selectAllButton = getByText(i18n.SELECT_ALL_FIELDS(defaultProps.totalFields));

    fireEvent.click(selectAllButton);

    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });
});
