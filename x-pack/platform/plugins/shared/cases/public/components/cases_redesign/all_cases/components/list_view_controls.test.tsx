/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ListViewControls } from './list_view_controls';
import { ColumnsPopover } from './columns_popover';
import * as i18n from '../translations';

jest.mock('./columns_popover', () => ({
  ColumnsPopover: jest.fn(() => <div data-test-subj="mock-columns-popover" />),
}));

const ColumnsPopoverMock = ColumnsPopover as jest.Mock;

const defaultProps = {
  selectedFields: [{ field: 'tags', name: 'Tags', isChecked: true }],
  onSelectedFieldsChange: jest.fn(),
};

describe('ListViewControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ColumnsPopover with correct props', () => {
    render(<ListViewControls {...defaultProps} />);

    expect(ColumnsPopoverMock).toHaveBeenCalledWith(
      {
        selectedColumns: defaultProps.selectedFields,
        onSelectedColumnsChange: defaultProps.onSelectedFieldsChange,
        buttonLabel: i18n.FIELDS_BUTTON_LABEL,
        buttonIconType: 'list',
      },
      {}
    );
    expect(ColumnsPopoverMock.mock.results[0].value).toBeDefined();
  });
});
