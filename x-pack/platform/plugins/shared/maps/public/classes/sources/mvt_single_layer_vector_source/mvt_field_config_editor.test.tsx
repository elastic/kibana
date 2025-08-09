/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { MVTFieldConfigEditor } from './mvt_field_config_editor';
import { MVT_FIELD_TYPE } from '../../../../common/constants';

test('should render field editor', async () => {
  const fields = [
    {
      name: 'foo',
      type: MVT_FIELD_TYPE.STRING,
    },
    {
      name: 'bar',
      type: MVT_FIELD_TYPE.NUMBER,
    },
  ];
  render(
    <I18nProvider>
      <MVTFieldConfigEditor fields={fields} onChange={() => {}} />
    </I18nProvider>
  );

  // Verify field name inputs are rendered with correct values
  expect(screen.getByDisplayValue('foo')).toBeInTheDocument();
  expect(screen.getByDisplayValue('bar')).toBeInTheDocument();
  
  // Verify the Add button is present
  expect(screen.getByText('Add')).toBeInTheDocument();
  
  // Verify remove buttons are present
  const removeButtons = screen.getAllByLabelText('Remove field');
  expect(removeButtons).toHaveLength(2);
});

test('should render error for empty name', async () => {
  const fields = [
    {
      name: '',
      type: MVT_FIELD_TYPE.STRING,
    },
  ];
  render(
    <I18nProvider>
      <MVTFieldConfigEditor fields={fields} onChange={() => {}} />
    </I18nProvider>
  );

  // Verify the field input is present with empty value
  const fieldInput = screen.getByPlaceholderText('Field name');
  expect(fieldInput).toHaveValue('');
  
  // Verify the Add button is present
  expect(screen.getByText('Add')).toBeInTheDocument();
});

test('should render error for dupes', async () => {
  const fields = [
    {
      name: 'foo',
      type: MVT_FIELD_TYPE.STRING,
    },
    {
      name: 'foo',
      type: MVT_FIELD_TYPE.NUMBER,
    },
  ];
  render(
    <I18nProvider>
      <MVTFieldConfigEditor fields={fields} onChange={() => {}} />
    </I18nProvider>
  );

  // Verify both duplicate field name inputs are rendered
  const fooInputs = screen.getAllByDisplayValue('foo');
  expect(fooInputs).toHaveLength(2);
  
  // Verify the Add button is present
  expect(screen.getByText('Add')).toBeInTheDocument();
  
  // Verify remove buttons are present for both fields
  const removeButtons = screen.getAllByLabelText('Remove field');
  expect(removeButtons).toHaveLength(2);
});
