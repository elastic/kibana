/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { AdditionalFormField, type AdditionalFormFieldProps } from './additional_form_field';

import { renderWithTestingProviders } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';

describe('Resilient AdditionalFormField', () => {
  describe('select field', () => {
    const testSelectField: AdditionalFormFieldProps['field'] = {
      name: 'test_select',
      input_type: 'select',
      values: [
        {
          default: true,
          label: 'testing',
          value: 64,
          enabled: true,
          hidden: false,
        },
      ],
      read_only: false,
      required: null,
      text: 'Test select with default',
      internal: false,
      prefix: null,
    };
    it('displays correct default value', () => {
      renderWithTestingProviders(
        <MockFormWrapperComponent>
          <AdditionalFormField field={testSelectField} />
        </MockFormWrapperComponent>
      );
      expect(screen.getByTestId('resilientAdditionalField-test_select')).toHaveValue('64');
    });

    it('marks as required when required="always"', () => {
      const requiredTestSelectField: AdditionalFormFieldProps['field'] = {
        ...testSelectField,
        required: 'always',
      };
      renderWithTestingProviders(
        <MockFormWrapperComponent>
          <AdditionalFormField field={requiredTestSelectField} />
        </MockFormWrapperComponent>
      );
      const selectField = screen.getByTestId('resilientAdditionalField-test_select');
      expect(selectField).toBeRequired();
    });

    it('does not mark as required', () => {
      const requiredTestSelectField: AdditionalFormFieldProps['field'] = {
        ...testSelectField,
        required: null,
      };
      renderWithTestingProviders(
        <MockFormWrapperComponent>
          <AdditionalFormField field={requiredTestSelectField} />
        </MockFormWrapperComponent>
      );
      const selectField = screen.getByTestId('resilientAdditionalField-test_select');
      expect(selectField).not.toBeRequired();
    });
  });

  describe('multiselect field', () => {
    it('fields display correct default values', () => {
      renderWithTestingProviders(
        <MockFormWrapperComponent>
          <AdditionalFormField
            field={{
              name: 'test_multi_select',
              input_type: 'multiselect',
              values: [
                {
                  default: true,
                  label: 'testing1',
                  value: 64,
                  enabled: true,
                  hidden: false,
                },
                {
                  default: true,
                  label: 'testing2',
                  value: 65,
                  enabled: true,
                  hidden: false,
                },
                {
                  default: false,
                  label: 'testing3',
                  value: 66,
                  enabled: true,
                  hidden: false,
                },
              ],
              read_only: false,
              required: null,
              text: 'Test multi select with default',
              internal: false,
              prefix: null,
            }}
          />
        </MockFormWrapperComponent>
      );
      const container = screen.getByTestId('resilientAdditionalField-test_multi_select');
      expect(container).toHaveTextContent('testing1');
      expect(container).toHaveTextContent('testing2');
      expect(container).not.toHaveTextContent('testing3');
    });
  });
});
