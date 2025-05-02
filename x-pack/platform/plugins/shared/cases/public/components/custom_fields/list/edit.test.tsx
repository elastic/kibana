/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { FormTestComponent } from '../../../common/test_utils';
import { Edit } from './edit';
import { customFieldsMock, customFieldsConfigurationMock } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import type {
  CaseCustomFieldList,
  ListCustomFieldConfiguration,
} from '../../../../common/types/domain';
import { POPULATED_WITH_DEFAULT } from '../translations';

describe('Edit ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customField = customFieldsMock[6] as CaseCustomFieldList;
  const customFieldConfiguration = customFieldsConfigurationMock[6] as ListCustomFieldConfiguration;
  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-list-custom-field-test_key_7')).toBeInTheDocument();
    expect(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    ).toBeInTheDocument();
    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(await screen.findByText('Option 1')).toBeInTheDocument();
  });

  it('does not show the edit button if the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId('case-list-custom-field-edit-button-test_key_7')
    ).not.toBeInTheDocument();
  });

  it('does not show the edit button when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId('case-list-custom-field-edit-button-test_key_7')
    ).not.toBeInTheDocument();
  });

  it('shows the loading spinner when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId('case-list-custom-field-loading-test_key_7')
    ).toBeInTheDocument();
  });

  it('shows the no value text if the custom field is undefined', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByText('No value is added')).toBeInTheDocument();
  });

  it('uses the required value correctly if a required field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByText('No value is added')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    );

    expect(
      await screen.findByTestId(`case-list-custom-field-form-field-${customFieldConfiguration.key}`)
    ).toHaveValue(customFieldConfiguration.defaultValue as string);
    expect(
      await screen.findByText('This field is populated with the default value.')
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-submit-button-test_key_7')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: { option_1: 'Option 1' },
      });
    });
  });

  it('does not show the value when the custom field is undefined', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('list-custom-field-view-test_key_7')).not.toBeInTheDocument();
  });

  it('does not show the value when the value is null', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('list-custom-field-view-test_key_7')).not.toBeInTheDocument();
  });

  it('does not show the form when the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId('case-list-custom-field-form-field-test_key_7')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('case-list-custom-field-submit-button-test_key_7')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('case-list-custom-field-cancel-button-test_key_7')
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit when changing value', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    );
    await userEvent.selectOptions(
      await screen.findByTestId('case-list-custom-field-form-field-test_key_7'),
      await screen.findByRole('option', { name: 'Option 2' })
    );

    expect(
      await screen.findByTestId('case-list-custom-field-submit-button-test_key_7')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-submit-button-test_key_7')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: { option_2: 'Option 2' },
      });
    });
  });

  it('calls onSubmit with defaultValue if no initialValue exists', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{
            ...customField,
            value: null,
          }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    );

    expect(await screen.findByText(POPULATED_WITH_DEFAULT)).toBeInTheDocument();
    expect(await screen.findByTestId('case-list-custom-field-form-field-test_key_7')).toHaveValue(
      customFieldConfiguration.defaultValue as string
    );
    expect(
      await screen.findByTestId('case-list-custom-field-submit-button-test_key_7')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-submit-button-test_key_7')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: { option_1: 'Option 1' },
      });
    });
  });

  it('hides the form when clicking the cancel button', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    );

    expect(
      await screen.findByTestId('case-list-custom-field-form-field-test_key_7')
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-cancel-button-test_key_7')
    );

    expect(
      screen.queryByTestId('case-list-custom-field-form-field-test_key_7')
    ).not.toBeInTheDocument();
  });

  it('reset to initial value when canceling', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    );
    await userEvent.selectOptions(
      await screen.findByTestId('case-list-custom-field-form-field-test_key_7'),
      await screen.findByRole('option', { name: 'Option 2' })
    );

    expect(
      await screen.findByTestId('case-list-custom-field-submit-button-test_key_7')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-cancel-button-test_key_7')
    );

    expect(
      screen.queryByTestId('case-list-custom-field-form-field-test_key_7')
    ).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId('case-list-custom-field-edit-button-test_key_7')
    );
    expect(await screen.findByTestId('case-list-custom-field-form-field-test_key_7')).toHaveValue(
      'option_1'
    );
  });
});
