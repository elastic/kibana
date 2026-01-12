/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { connector } from '../mock';
import { useGetFieldsResponse } from './mocks';
import { useGetFields } from './use_get_fields';
import Fields from './case_fields';

import { renderWithTestingProviders } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_fields');

const useGetFieldsMock = useGetFields as jest.Mock;

describe('ResilientParamsFields renders', () => {
  const fields = {
    severityCode: '6',
    incidentTypes: ['19'],
    additionalFields: `{
      "customField1": "customValue1",
      "test_text": "some text",
      "test_text_area": "some textarea",
      "test_boolean": false,
      "test_number": 1234,
      "test_select": 110,
      "test_multi_select": [
        120,
        130
      ],
      "test_date_picker": 1234567890123,
      "test_date_time_picker": 1234567890123,
      "resolution_summary": "some resolution summary"
    }`,
  };

  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    useGetFieldsMock.mockReturnValue(useGetFieldsResponse);
    jest.clearAllMocks();
  });

  it('all params fields are rendered', () => {
    renderWithTestingProviders(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByText('Malware')).toBeInTheDocument();
    expect(screen.getByTestId('severitySelect')).toHaveValue('6');
    expect(screen.getByTestId('resilientAdditionalFieldsComboBox')).toBeInTheDocument();
  });

  it('disables the fields when loading field data', async () => {
    useGetFieldsMock.mockReturnValue({ ...useGetFieldsResponse, isLoading: true });

    renderWithTestingProviders(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(within(screen.getByTestId('incidentTypeComboBox')).getByRole('combobox')).toBeDisabled();
    expect(screen.getByTestId('severitySelect')).toBeDisabled();
  });

  it('sets issue type correctly', async () => {
    renderWithTestingProviders(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const checkbox = within(screen.getByTestId('incidentTypeComboBox')).getByTestId(
      'comboBoxSearchInput'
    );

    await user.type(checkbox, 'Denial of Service{enter}');

    expect(screen.getByText('Denial of Service')).toBeInTheDocument();
  });

  it('sets severity correctly', async () => {
    renderWithTestingProviders(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    await user.selectOptions(screen.getByTestId('severitySelect'), 'Low');
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('sets additional fields correctly', async () => {
    renderWithTestingProviders(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const testText = screen.getByTestId('resilientAdditionalField-test_text');
    const testTextArea = screen.getByTestId('resilientAdditionalField-test_text_area');
    const testBoolean = screen.getByTestId('resilientAdditionalField-test_boolean');
    const testNumber = screen.getByTestId('resilientAdditionalField-test_number');
    const testSelect = screen.getByTestId('resilientAdditionalField-test_select');

    // multi-select and date (time) fields are not interactively
    // tested here because they're complex EUI components
    // we're checking that they render correctly though
    screen.getByTestId('resilientAdditionalField-test_multi_select');
    screen.getByTestId('resilientAdditionalField-test_date_picker');
    screen.getByTestId('resilientAdditionalField-test_date_time_picker');

    expect(testText).toHaveValue('some text');
    expect(testTextArea).toHaveValue('some textarea');
    expect(testBoolean).not.toBeChecked();
    expect(testNumber).toHaveValue(1234);
    expect(testSelect).toHaveValue('110');

    await user.type(testText, ' more text');
    await user.type(testTextArea, ' more textarea');
    await user.click(testBoolean);
    await user.clear(testNumber);
    await user.type(testNumber, '5678');
    await user.selectOptions(testSelect, '120');

    expect(testText).toHaveValue('some text more text');
    expect(testTextArea).toHaveValue('some textarea more textarea');
    expect(testBoolean).toBeChecked();
    expect(testNumber).toHaveValue(5678);
    expect(testSelect).toHaveValue('120');
  });

  it('should submit a resilient connector', async () => {
    renderWithTestingProviders(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('incidentTypeComboBox')).toBeInTheDocument();
    });

    expect(screen.getByRole('option', { name: 'Low' }));

    const checkbox = within(screen.getByTestId('incidentTypeComboBox')).getByTestId(
      'comboBoxSearchInput'
    );

    await user.type(checkbox, 'Denial of Service{enter}');

    await user.selectOptions(screen.getByTestId('severitySelect'), ['4']);

    expect(screen.getByText('Denial of Service')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});
