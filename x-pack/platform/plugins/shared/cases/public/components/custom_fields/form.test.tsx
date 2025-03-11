/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CustomFieldsForm } from './form';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import * as i18n from './translations';
import userEvent from '@testing-library/user-event';
import { customFieldsConfigurationMock } from '../../containers/mock';
import type { FormState } from '../configure_cases/flyout';

// FLAKY: https://github.com/elastic/kibana/issues/208415
describe.skip('CustomFieldsForm ', () => {
  let appMockRender: AppMockRenderer;
  const onChange = jest.fn();

  const props = {
    onChange,
    initialValue: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    expect(await screen.findByTestId('custom-field-label-input')).toBeInTheDocument();
    expect(await screen.findByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('renders text as default custom field type', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    expect(await screen.findByTestId('custom-field-type-selector')).toBeInTheDocument();
    expect(await screen.findByText('Text')).toBeInTheDocument();

    expect(await screen.findByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('renders custom field type options', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    expect(await screen.findByText('Text')).toBeInTheDocument();
    expect(await screen.findByText('Toggle')).toBeInTheDocument();
    expect(await screen.findByTestId('custom-field-type-selector')).not.toHaveAttribute('disabled');
  });

  it('renders toggle custom field type', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
      target: { value: CustomFieldTypes.TOGGLE },
    });

    expect(await screen.findByTestId('toggle-custom-field-required')).toBeInTheDocument();
    expect(await screen.findByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('serializes the data correctly if required is selected', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    appMockRender.render(<CustomFieldsForm onChange={onChangeState} initialValue={null} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await userEvent.click(await screen.findByTestId('custom-field-label-input'));
    await userEvent.paste('Summary');
    await userEvent.click(await screen.findByTestId('text-custom-field-required'));
    await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
    await userEvent.paste('Default value');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary',
        required: true,
        type: 'text',
        defaultValue: 'Default value',
      });
    });
  });

  it('serializes the data correctly if required is selected and the text default value is not filled', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    appMockRender.render(<CustomFieldsForm onChange={onChangeState} initialValue={null} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await userEvent.click(await screen.findByTestId('custom-field-label-input'));
    await userEvent.paste('Summary');
    await userEvent.click(await screen.findByTestId('text-custom-field-required'));

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary',
        required: true,
        type: 'text',
      });
    });
  });

  it('serializes the data correctly if required is selected and the text default value is an empty string', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    appMockRender.render(<CustomFieldsForm onChange={onChangeState} initialValue={null} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await userEvent.click(await screen.findByTestId('custom-field-label-input'));
    await userEvent.paste('Summary');
    await userEvent.click(await screen.findByTestId('text-custom-field-required'));
    await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
    await userEvent.paste(' ');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary',
        required: true,
        type: 'text',
      });
    });
  });

  it('serializes the data correctly if the initial default value is null', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    const initialValue = {
      required: true,
      type: CustomFieldTypes.TEXT as const,
      defaultValue: null,
    };

    appMockRender.render(
      <CustomFieldsForm
        onChange={onChangeState}
        initialValue={
          {
            key: 'test_key_1',
            label: 'Summary',
            ...initialValue,
          } as CustomFieldConfiguration
        }
      />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await userEvent.click(await screen.findByTestId('custom-field-label-input'));
    await userEvent.paste(' New');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary New',
        ...initialValue,
      });
    });
  });

  it('serializes the data correctly if required is not selected', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    appMockRender.render(<CustomFieldsForm onChange={onChangeState} initialValue={null} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    await userEvent.click(await screen.findByTestId('custom-field-label-input'));
    await userEvent.paste('Summary');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary',
        required: false,
        type: 'text',
      });
    });
  });

  it('deserializes the "type: text" custom field data correctly', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    appMockRender.render(
      <CustomFieldsForm onChange={onChangeState} initialValue={customFieldsConfigurationMock[0]} />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');

    expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
      'value',
      customFieldsConfigurationMock[0].label
    );
    expect(await screen.findByTestId('text-custom-field-required')).toHaveAttribute('checked');
    expect(await screen.findByTestId('text-custom-field-default-value')).toHaveAttribute(
      'value',
      customFieldsConfigurationMock[0].defaultValue
    );

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual(customFieldsConfigurationMock[0]);
    });
  });

  it('deserializes the "type: toggle" custom field data correctly', async () => {
    let formState: FormState<CustomFieldConfiguration>;

    const onChangeState = (state: FormState<CustomFieldConfiguration>) => (formState = state);

    appMockRender.render(
      <CustomFieldsForm onChange={onChangeState} initialValue={customFieldsConfigurationMock[1]} />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');

    expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
      'value',
      customFieldsConfigurationMock[1].label
    );
    expect(await screen.findByTestId('toggle-custom-field-required')).toHaveAttribute('checked');
    expect(await screen.findByTestId('toggle-custom-field-default-value')).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual(customFieldsConfigurationMock[1]);
    });
  });
});
