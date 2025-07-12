/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Toolbar } from '.';
import { SELECTED_FIELDS } from '../../context_editor/translations';

const selected = ['event.action', 'event.category', 'user.name'];

describe('Toolbar', () => {
  const defaultProps = {
    onListUpdated: jest.fn(),
    onlyDefaults: false,
    onSelectAll: jest.fn(),
    selectedFields: [], // no rows selected
    totalFields: 5,
    anonymizationAllFieldsData: [
      { id: '1', field: 'event.action', allowed: true, anonymized: false },
      { id: '2', field: 'event.category', allowed: true, anonymized: false },
    ],
    handleRowChecked: jest.fn(),
    handleUnselectAll: jest.fn(),
  };

  it('displays the number of selected fields', () => {
    const { getByText } = render(<Toolbar {...defaultProps} selectedFields={selected} />);

    const selectedCount = selected.length;
    const selectedFieldsText = getByText(SELECTED_FIELDS(selectedCount));

    expect(selectedFieldsText).toBeInTheDocument();
  });

  it('disables bulk actions when no rows are selected', () => {
    const { getByTestId } = render(<Toolbar {...defaultProps} />);

    const bulkActionsButton = getByTestId('bulkActionsButton');

    expect(bulkActionsButton).toBeDisabled();
  });

  it('enables bulk actions when some fields are selected', () => {
    const { getByTestId } = render(<Toolbar {...defaultProps} selectedFields={selected} />);

    const bulkActionsButton = getByTestId('bulkActionsButton');

    expect(bulkActionsButton).not.toBeDisabled();
  });
});
