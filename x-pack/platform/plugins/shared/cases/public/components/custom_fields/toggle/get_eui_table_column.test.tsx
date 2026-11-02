/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { screen, render } from '@testing-library/react';
import { CENTER_ALIGNMENT } from '@elastic/eui';

import { CustomFieldTypes } from '../../../../common/types/domain';
import { getEuiTableColumn } from './get_eui_table_column';

describe('getEuiTableColumn ', () => {
  const key = 'test_key_1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a name and a render function', async () => {
    const label = 'MockLabel';

    expect(getEuiTableColumn({ label })).toEqual({
      name: label,
      render: expect.any(Function),
      maxWidth: '7em',
      minWidth: '2.5em',
      align: CENTER_ALIGNMENT,
      'data-test-subj': 'toggle-custom-field-column',
    });
  });

  it.each([
    ['true', 'check', { key, type: CustomFieldTypes.TOGGLE as const, value: true }],
    ['false', 'cross', { key, type: CustomFieldTypes.TOGGLE as const, value: false }],
    ['null', 'cross', { key, type: CustomFieldTypes.TOGGLE as const, value: null }],
  ])(
    'render function renders a toggle column with value %s correctly',
    async (_, expectedResult, customField) => {
      const label = 'MockLabel';
      const column = getEuiTableColumn({ label });

      render(<div>{column.render(customField)}</div>);

      const element = screen.getByTestId(
        `toggle-custom-field-column-view-${key}-${expectedResult}`
      );

      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent(customField.value ? 'On' : 'Off');
      expect(element).toHaveAttribute('data-euiicon-type', customField.value ? 'check' : 'cross');
    }
  );
});
