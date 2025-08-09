/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { ValidatedNumberInput } from './validated_number_input';

test('should render without error', async () => {
  render(
    <I18nProvider>
      <ValidatedNumberInput onChange={() => {}} initialValue={10} min={0} max={20} label={'foobar'} />
    </I18nProvider>
  );

  // Verify the form row label is present
  expect(screen.getByText('foobar')).toBeInTheDocument();
  
  // Verify the number input is rendered with correct value
  const numberInput = screen.getByLabelText('foobar number input');
  expect(numberInput).toBeInTheDocument();
  expect(numberInput).toHaveValue(10);
  expect(numberInput).not.toBeInvalid();
  
  // Verify no error message is displayed
  expect(screen.queryByText('Must be between 0 and 20')).not.toBeInTheDocument();
});

test('should render with error', async () => {
  render(
    <I18nProvider>
      <ValidatedNumberInput onChange={() => {}} initialValue={30} min={0} max={20} label={'foobar'} />
    </I18nProvider>
  );

  // Verify the form row label is present
  expect(screen.getByText('foobar')).toBeInTheDocument();
  
  // Verify the number input is rendered with invalid value
  const numberInput = screen.getByLabelText('foobar number input');
  expect(numberInput).toBeInTheDocument();
  expect(numberInput).toHaveValue(30);
  expect(numberInput).toBeInvalid();
  
  // Verify error message is displayed
  expect(screen.getByText('Must be between 0 and 20')).toBeInTheDocument();
});
