/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { GlobalRegionField } from './global_region_field';

const renderField = (props: Partial<React.ComponentProps<typeof GlobalRegionField>> = {}) =>
  render(
    <I18nProvider>
      <GlobalRegionField
        value="us-east-1"
        onChange={jest.fn()}
        touched={false}
        onTouched={jest.fn()}
        {...props}
      />
    </I18nProvider>
  );

describe('GlobalRegionField', () => {
  it('shows the region', () => {
    renderField({ value: 'eu-west-1' });

    expect(screen.getByRole('combobox')).toHaveValue('eu-west-1');
  });

  it('shows no error until the region was touched', () => {
    renderField({ value: '' });

    expect(screen.queryByTestId('serviceSettingsStep-globalRegionError')).not.toBeInTheDocument();
  });

  it('shows the error when the touched region is empty', () => {
    renderField({ value: '', touched: true });

    expect(screen.getByTestId('serviceSettingsStep-globalRegionError')).toBeInTheDocument();
  });

  it('disables the field when told to', () => {
    renderField({ isDisabled: true });

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
