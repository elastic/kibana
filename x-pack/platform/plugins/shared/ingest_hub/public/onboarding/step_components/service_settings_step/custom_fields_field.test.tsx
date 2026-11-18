/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CustomFieldsField, type CustomFieldsFieldProps } from './custom_fields_field';

const renderField = (props: Partial<CustomFieldsFieldProps> = {}) => {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <CustomFieldsField value={[]} onChange={onChange} {...props} />
    </I18nProvider>
  );
  return onChange;
};

describe('CustomFieldsField', () => {
  it('adds an empty row', () => {
    const onChange = renderField({ value: [{ name: 'team', value: 'platform' }] });
    fireEvent.click(screen.getByTestId('sharedSettingsCustomFieldsAdd'));
    expect(onChange).toHaveBeenCalledWith([
      { name: 'team', value: 'platform' },
      { name: '', value: '' },
    ]);
  });

  it('edits the name and the value of one row', () => {
    const value = [
      { name: 'team', value: 'platform' },
      { name: 'env', value: 'prod' },
    ];
    const onChange = renderField({ value });
    fireEvent.change(screen.getByTestId('sharedSettingsCustomFieldName-1'), {
      target: { value: 'stage' },
    });
    expect(onChange).toHaveBeenLastCalledWith([value[0], { name: 'stage', value: 'prod' }]);
    fireEvent.change(screen.getByTestId('sharedSettingsCustomFieldValue-0'), {
      target: { value: 'infra' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'team', value: 'infra' }, value[1]]);
  });

  it('removes a row', () => {
    const onChange = renderField({
      value: [
        { name: 'team', value: 'platform' },
        { name: 'env', value: 'prod' },
      ],
    });
    fireEvent.click(screen.getByTestId('sharedSettingsCustomFieldRemove-0'));
    expect(onChange).toHaveBeenCalledWith([{ name: 'env', value: 'prod' }]);
  });

  it('shows the error of a row and of the list', () => {
    renderField({
      value: [{ name: 'my team', value: 'a' }],
      errors: { rows: [{ name: 'Name cannot contain spaces.' }], list: 'Too many.' },
    });
    expect(screen.getByText('Name cannot contain spaces.')).toBeInTheDocument();
    expect(screen.getByText('Too many.')).toBeInTheDocument();
  });

  it('notes that ECF services do not support custom fields only when asked to', () => {
    renderField();
    expect(screen.queryByTestId('sharedSettingsCustomFieldsEcfNote')).not.toBeInTheDocument();
  });

  it('shows the ECF note when a selected service is deployed through ECF', () => {
    renderField({ hasServicesIgnoringCustomFields: true });
    expect(screen.getByTestId('sharedSettingsCustomFieldsEcfNote')).toBeInTheDocument();
  });
});
