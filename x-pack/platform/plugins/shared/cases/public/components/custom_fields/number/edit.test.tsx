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
import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import { POPULATED_WITH_DEFAULT } from '../translations';

describe('Edit ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customField = customFieldsMock[4] as CaseCustomFieldNumber;
  const customFieldConfiguration = customFieldsConfigurationMock[4];

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

    expect(await screen.findByTestId('case-number-custom-field-test_key_5')).toBeInTheDocument();
    expect(
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    ).toBeInTheDocument();
    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(await screen.findByText('1234')).toBeInTheDocument();
  });

  it('does not shows the edit button if the user does not have permissions', async () => {
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
      screen.queryByTestId('case-number-custom-field-edit-button-test_key_1')
    ).not.toBeInTheDocument();
  });

  it('does not shows the edit button when loading', async () => {
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
      screen.queryByTestId('case-number-custom-field-edit-button-test_key_1')
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
      await screen.findByTestId('case-number-custom-field-loading-test_key_5')
    ).toBeInTheDocument();
  });

  it('shows the no value number if the custom field is undefined', async () => {
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );

    expect(
      await screen.findByTestId(
        `case-number-custom-field-form-field-${customFieldConfiguration.key}`
      )
    ).toHaveValue(customFieldConfiguration.defaultValue as number);
    expect(
      await screen.findByText('This field is populated with the default value.')
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: customFieldConfiguration.defaultValue,
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

    expect(screen.queryByTestId('number-custom-field-view-test_key_5')).not.toBeInTheDocument();
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

    expect(screen.queryByTestId('number-custom-field-view-test_key_5')).not.toBeInTheDocument();
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
      screen.queryByTestId('case-number-custom-field-form-field-test_key_5')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('case-number-custom-field-submit-button-test_key_5')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('case-number-custom-field-cancel-button-test_key_5')
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );
    await userEvent.paste('12345');

    expect(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: 123412345,
      });
    });
  });

  it('calls onSubmit with 0 when the value is 0', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.clear(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );
    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );
    await userEvent.paste('0');

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: 0,
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );

    expect(await screen.findByText(POPULATED_WITH_DEFAULT)).toBeInTheDocument();
    expect(await screen.findByTestId('case-number-custom-field-form-field-test_key_5')).toHaveValue(
      customFieldConfiguration.defaultValue as number
    );
    expect(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: customFieldConfiguration.defaultValue,
      });
    });
  });

  it('sets the value to null if the number field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.clear(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );

    expect(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: null,
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );

    expect(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-cancel-button-test_key_5')
    );

    expect(
      screen.queryByTestId('case-number-custom-field-form-field-test_key_5')
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );
    await userEvent.paste('321');

    expect(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-cancel-button-test_key_5')
    );

    expect(
      screen.queryByTestId('case-number-custom-field-form-field-test_key_5')
    ).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    expect(await screen.findByTestId('case-number-custom-field-form-field-test_key_5')).toHaveValue(
      1234
    );
  });

  it('shows validation error if the field is required', async () => {
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.clear(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );

    expect(await screen.findByText('My test label 5 is required.')).toBeInTheDocument();
  });

  it('does not shows a validation error if the field is not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.clear(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );

    expect(
      await screen.findByTestId('case-number-custom-field-submit-button-test_key_5')
    ).not.toBeDisabled();

    expect(screen.queryByText('My test label 1 is required.')).not.toBeInTheDocument();
  });

  it('shows validation error if the number is too big', async () => {
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
      await screen.findByTestId('case-number-custom-field-edit-button-test_key_5')
    );
    await userEvent.clear(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );
    await userEvent.click(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    );
    await userEvent.paste(`${2 ** 53 + 1}`);

    expect(
      await screen.findByText(
        'The value of the My test label 5 should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      )
    ).toBeInTheDocument();
  });
});

describe('Edit inline variant', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customField = customFieldsMock[4] as CaseCustomFieldNumber;
  const customFieldConfiguration = customFieldsConfigurationMock[4];
  const formFieldTestId = `case-number-custom-field-form-field-${customFieldConfiguration.key}`;
  const confirmTestId = `template-field-confirm-${customFieldConfiguration.key}`;
  const cancelTestId = `template-field-cancel-${customFieldConfiguration.key}`;

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-number-custom-field-test_key_5')).toBeInTheDocument();
    expect(await screen.findByTestId(formFieldTestId)).toBeInTheDocument();
    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(await screen.findByTestId(formFieldTestId)).toHaveValue(1234);
    expect(screen.queryByTestId(confirmTestId)).not.toBeInTheDocument();
  });

  it('shows the optional label when the field is not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('form-optional-field-label')).toBeInTheDocument();
  });

  it('does not show the optional label when the field is required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId(formFieldTestId)).toBeInTheDocument();
    expect(screen.queryByTestId('form-optional-field-label')).not.toBeInTheDocument();
  });

  it('disables the field if the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId(formFieldTestId)).toBeDisabled();
    expect(screen.queryByTestId(confirmTestId)).not.toBeInTheDocument();
  });

  it('disables the field when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId(formFieldTestId)).toBeDisabled();
  });

  it('shows the loading spinner when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId('case-number-custom-field-loading-test_key_5')
    ).toBeInTheDocument();
  });

  it('shows the default value when the custom field is undefined', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId(formFieldTestId)).toHaveValue(
      customFieldConfiguration.defaultValue as number
    );
    expect(await screen.findByText(POPULATED_WITH_DEFAULT)).toBeInTheDocument();
  });

  it('uses the required value correctly if a required field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId(formFieldTestId)).toHaveValue(
      customFieldConfiguration.defaultValue as number
    );
    expect(await screen.findByText(POPULATED_WITH_DEFAULT)).toBeInTheDocument();

    await userEvent.clear(await screen.findByTestId(formFieldTestId));
    await userEvent.type(
      await screen.findByTestId(formFieldTestId),
      String((customFieldConfiguration.defaultValue as number) + 1)
    );

    await userEvent.click(await screen.findByTestId(confirmTestId));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: (customFieldConfiguration.defaultValue as number) + 1,
      });
    });
  });

  it('calls onSubmit when changing value', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));
    await userEvent.type(await screen.findByTestId(formFieldTestId), '12345');

    expect(await screen.findByTestId(confirmTestId)).not.toBeDisabled();

    await userEvent.click(await screen.findByTestId(confirmTestId));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: 12345,
      });
    });
  });

  it('calls onSubmit with 0 when the value is 0', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));
    await userEvent.type(await screen.findByTestId(formFieldTestId), '0');

    await userEvent.click(await screen.findByTestId(confirmTestId));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: 0,
      });
    });
  });

  it('sets the value to null if the number field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));

    expect(await screen.findByTestId(confirmTestId)).not.toBeDisabled();

    await userEvent.click(await screen.findByTestId(confirmTestId));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: null,
      });
    });
  });

  it('hides confirm/cancel after canceling and resets the value', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));
    await userEvent.type(await screen.findByTestId(formFieldTestId), '321');

    expect(await screen.findByTestId(confirmTestId)).toBeInTheDocument();
    expect(await screen.findByTestId(formFieldTestId)).toHaveValue(321);

    await userEvent.click(await screen.findByTestId(cancelTestId));

    await waitFor(() => {
      expect(screen.queryByTestId(confirmTestId)).not.toBeInTheDocument();
    });
    expect(await screen.findByTestId(formFieldTestId)).toHaveValue(1234);
  });

  it('shows validation error if the field is required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));

    expect(await screen.findByText('My test label 5 is required.')).toBeInTheDocument();
  });

  it('does not shows a validation error if the field is not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));

    expect(await screen.findByTestId(confirmTestId)).not.toBeDisabled();
    expect(screen.queryByText('My test label 5 is required.')).not.toBeInTheDocument();
  });

  it('shows validation error if the number is too big', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          editVariant="inline"
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.clear(await screen.findByTestId(formFieldTestId));
    await userEvent.click(await screen.findByTestId(formFieldTestId));
    await userEvent.paste(`${2 ** 53 + 1}`);

    expect(
      await screen.findByText(
        'The value of the My test label 5 should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      )
    ).toBeInTheDocument();
  });
});
