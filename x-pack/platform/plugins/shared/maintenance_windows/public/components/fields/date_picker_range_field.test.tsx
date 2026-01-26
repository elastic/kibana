/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import moment from 'moment';

import { screen } from '@testing-library/react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { AppMockRenderer } from '../../lib/test_utils';
import { createAppMockRenderer } from '../../lib/test_utils';
import type { FormProps } from '../schema';
import { DatePickerRangeField } from './date_picker_range_field';

jest.mock('../../utils/kibana_react');
jest.mock('../../helpers/get_selected_for_date_picker');

const { useUiSetting } = jest.requireMock('../../utils/kibana_react');
const { getSelectedForDatePicker } = jest.requireMock('../../helpers/get_selected_for_date_picker');

describe('DatePickerRangeField', () => {
  let appMockRenderer: AppMockRenderer;

  const MockHookWrapperComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: {},
      schema: {
        startDate: {},
        endDate: {},
      },
      onSubmit: jest.fn(),
    });

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders the dates in the settings format', async () => {
    // ISO format
    const startDate = '2023-03-24T07:28:00.000Z';
    const endDate = '2023-03-26T07:31:00.000Z';

    // some random format
    useUiSetting.mockReturnValue('YYYY.MM.DD, h:mm:ss');
    getSelectedForDatePicker
      .mockReturnValueOnce({ selected: moment(startDate), utcOffset: 0 })
      .mockReturnValueOnce({ selected: moment(endDate), utcOffset: 0 });

    const fields = {
      startDate: {
        value: startDate,
        label: 'startDate',
        path: 'startDate',
      } as FieldHook<string, string>,
      endDate: {
        value: endDate,
        label: 'endDate',
        path: 'endDate',
      } as FieldHook<string, string>,
    };

    appMockRenderer.render(
      <MockHookWrapperComponent>
        <DatePickerRangeField fields={fields} data-test-subj={'datePicker'} />
      </MockHookWrapperComponent>
    );

    expect(await screen.findByTestId('datePicker')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('2023.03.24, 3:28:00')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('2023.03.26, 3:31:00')).toBeInTheDocument();
  });
});
