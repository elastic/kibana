/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../../../common/test_utils';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { OptionsField, INITIAL_OPTIONS } from './options_field';

const OPTIONS_FIELD_TEST_TIMEOUT = 15000;

describe('Options field', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <UseField
          path="options"
          component={OptionsField}
          componentProps={{
            label: 'Values',
            'data-test-subj': 'options-field',
          }}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('options-field')).toBeInTheDocument();
    expect(await screen.findByTestId('options-field-option-label-0')).toBeInTheDocument();
    expect((await screen.findByTestId('options-field-option-label-0')).getAttribute('value')).toBe(
      INITIAL_OPTIONS[0].label
    );
  });

  it(
    'adds and removes options correctly',
    async () => {
      render(
        <FormTestComponent onSubmit={onSubmit}>
          <UseField
            path="options"
            component={OptionsField}
            componentProps={{
              label: 'Values',
              'data-test-subj': 'options-field',
            }}
          />
        </FormTestComponent>
      );

      expect(await screen.findByTestId('options-field')).toBeInTheDocument();
      await userEvent.click(await screen.findByTestId('options-field-option-label-0'));
      await userEvent.paste('Value 1');
      await userEvent.click(await screen.findByTestId('options-field-add-option'));
      await waitFor(async () =>
        expect(await screen.findByTestId('options-field-option-label-1')).toBeInTheDocument()
      );
      await userEvent.click(await screen.findByTestId('options-field-option-label-1'));
      await userEvent.paste('Value 2');
      await userEvent.click(await screen.findByTestId('options-field-remove-option-0'));
      // Value 2 should move to index 0 and index 1 should be removed
      expect(
        (await screen.findByTestId('options-field-option-label-0')).getAttribute('value')
      ).toBe('Value 2');
      await expect(screen.findByTestId('options-field-option-label-1')).rejects.toThrow();
    },
    OPTIONS_FIELD_TEST_TIMEOUT
  );

  it(
    'adds no more than maximum set options',
    async () => {
      render(
        <FormTestComponent onSubmit={onSubmit}>
          <UseField
            path="options"
            component={OptionsField}
            componentProps={{
              label: 'Values',
              maxOptions: 3,
              'data-test-subj': 'options-field',
            }}
          />
        </FormTestComponent>
      );

      expect(await screen.findByTestId('options-field')).toBeInTheDocument();
      expect(await screen.findByTestId('options-field-option-label-0')).toBeInTheDocument();
      await userEvent.click(await screen.findByTestId('options-field-add-option'));
      await userEvent.click(await screen.findByTestId('options-field-add-option'));
      await expect(screen.findByTestId('options-field-add-option')).rejects.toThrow();
      await userEvent.click(await screen.findByTestId('options-field-remove-option-0'));
      expect(await screen.findByTestId('options-field-add-option')).toBeInTheDocument();
    },
    OPTIONS_FIELD_TEST_TIMEOUT
  );
});
