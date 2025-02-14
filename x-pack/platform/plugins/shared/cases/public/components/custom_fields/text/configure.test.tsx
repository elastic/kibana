/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../../common/test_utils';
import { Configure } from './configure';

// Failing: See https://github.com/elastic/kibana/issues/205987
describe.skip('Configure ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('text-custom-field-required')).toBeInTheDocument();
  });

  it('updates field options correctly when not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, true);
    });
  });

  // Flaky: https://github.com/elastic/kibana/issues/178001
  it.skip('updates field options with default value correctly when not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
    await userEvent.paste('Default value');
    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          defaultValue: 'Default value',
        },
        true
      );
    });
  });

  it('updates field options correctly when required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('text-custom-field-required'));
    await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
    await userEvent.paste('Default value');
    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          required: true,
          defaultValue: 'Default value',
        },
        true
      );
    });
  });
});
