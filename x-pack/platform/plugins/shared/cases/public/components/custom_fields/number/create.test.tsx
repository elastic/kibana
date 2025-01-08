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
import { Create } from './create';
import { customFieldsConfigurationMock } from '../../../containers/mock';

// FLAKY: https://github.com/elastic/kibana/issues/202115
describe.skip('Create ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // required number custom field with a default value
  const customFieldConfiguration = customFieldsConfigurationMock[4];

  it('renders correctly with default value and required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-number-create-custom-field`)
    ).toHaveValue(customFieldConfiguration.defaultValue as number);
  });

  it('renders correctly without default value and not required', async () => {
    const optionalField = customFieldsConfigurationMock[5]; // optional number custom field

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={optionalField} />
      </FormTestComponent>
    );

    expect(await screen.findByText(optionalField.label)).toBeInTheDocument();
    expect(
      await screen.findByTestId(`${optionalField.key}-number-create-custom-field`)
    ).toHaveValue(null);
  });

  it('does not render default value when setDefaultValue is false', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={customFieldConfiguration}
          setDefaultValue={false}
        />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-number-create-custom-field`)
    ).toHaveValue(null);
  });

  it('renders loading state correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('disables the text when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-number-create-custom-field`)
    ).toHaveAttribute('disabled');
  });

  it('updates the value correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const numberCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-number-create-custom-field`
    );

    await userEvent.clear(numberCustomField);
    await userEvent.click(numberCustomField);
    await userEvent.paste('1234');
    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldConfiguration.key]: '1234',
          },
        },
        true
      );
    });
  });

  it('shows error when number is too big', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const numberCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-number-create-custom-field`
    );

    await userEvent.clear(numberCustomField);
    await userEvent.click(numberCustomField);
    await userEvent.paste(`${Number.MAX_SAFE_INTEGER + 1}`);

    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(
        'The value of the My test label 5 should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('shows error when number is too small', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
        />
      </FormTestComponent>
    );

    const numberCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-number-create-custom-field`
    );

    await userEvent.clear(numberCustomField);
    await userEvent.click(numberCustomField);
    await userEvent.paste(`${Number.MIN_SAFE_INTEGER - 1}`);

    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(
        'The value of the My test label 5 should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('shows error when number is required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{ ...customFieldConfiguration, required: true }}
        />
      </FormTestComponent>
    );

    await userEvent.clear(
      await screen.findByTestId(`${customFieldConfiguration.key}-number-create-custom-field`)
    );
    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(`${customFieldConfiguration.label} is required.`)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('does not show error when number is not required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{
            key: customFieldConfiguration.key,
            type: customFieldConfiguration.type,
            label: customFieldConfiguration.label,
            required: false,
          }}
        />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, true);
    });
  });
});
