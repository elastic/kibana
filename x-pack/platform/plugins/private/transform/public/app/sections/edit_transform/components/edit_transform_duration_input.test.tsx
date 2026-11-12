/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { getTransformConfigMock } from '../state_management/__mocks__/transform_config';
import { getDefaultState } from '../state_management/get_default_state';
import { useFormField } from '../state_management/selectors/form_field';
import { EditTransformDurationInput } from './edit_transform_duration_input';

const mockSetFormField = jest.fn();

jest.mock('../state_management/edit_transform_flyout_state', () => ({
  useEditTransformFlyoutActions: () => ({ setFormField: mockSetFormField }),
}));

jest.mock('../state_management/selectors/form_field');

describe('EditTransformDurationInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const frequencyField = getDefaultState(getTransformConfigMock()).formFields.frequency;
    jest.mocked(useFormField).mockReturnValue({ ...frequencyField, value: '10m' });
  });

  it('renders the duration value and its unit separately', () => {
    renderWithI18n(
      <EditTransformDurationInput
        defaultUnit="m"
        field="frequency"
        label="Frequency"
        units={['s', 'm', 'h']}
      />
    );

    expect(screen.getByTestId('transformEditFlyoutFrequencyInput')).toHaveValue(10);
    expect(screen.getByTestId('transformEditFlyoutFrequencyUnitSelect')).toHaveValue('m');
  });

  it('stores the value and selected unit in the Elasticsearch duration format', () => {
    renderWithI18n(
      <EditTransformDurationInput
        defaultUnit="m"
        field="frequency"
        label="Frequency"
        units={['s', 'm', 'h']}
      />
    );

    fireEvent.change(screen.getByTestId('transformEditFlyoutFrequencyInput'), {
      target: { value: '20' },
    });
    expect(mockSetFormField).toHaveBeenCalledWith({ field: 'frequency', value: '20m' });

    fireEvent.change(screen.getByTestId('transformEditFlyoutFrequencyUnitSelect'), {
      target: { value: 'h' },
    });
    expect(mockSetFormField).toHaveBeenCalledWith({ field: 'frequency', value: '10h' });
  });

  it('uses a unit selected while the duration value is empty', () => {
    const frequencyField = getDefaultState(getTransformConfigMock()).formFields.frequency;
    jest.mocked(useFormField).mockReturnValue({ ...frequencyField, value: '' });

    renderWithI18n(
      <EditTransformDurationInput
        defaultUnit="m"
        field="frequency"
        label="Frequency"
        units={['s', 'm', 'h']}
      />
    );

    fireEvent.change(screen.getByTestId('transformEditFlyoutFrequencyUnitSelect'), {
      target: { value: 'h' },
    });
    fireEvent.change(screen.getByTestId('transformEditFlyoutFrequencyInput'), {
      target: { value: '20' },
    });

    expect(mockSetFormField).toHaveBeenCalledWith({ field: 'frequency', value: '20h' });
  });

  it('preserves the existing unit when the duration value is cleared and replaced', () => {
    const frequencyField = getDefaultState(getTransformConfigMock()).formFields.frequency;
    jest.mocked(useFormField).mockReturnValue({ ...frequencyField, value: '30s' });

    const { rerender } = renderWithI18n(
      <EditTransformDurationInput
        defaultUnit="m"
        field="frequency"
        label="Frequency"
        units={['s', 'm', 'h']}
      />
    );

    fireEvent.change(screen.getByTestId('transformEditFlyoutFrequencyInput'), {
      target: { value: '' },
    });
    jest.mocked(useFormField).mockReturnValue({ ...frequencyField, value: '' });
    rerender(
      <I18nProvider>
        <EditTransformDurationInput
          defaultUnit="m"
          field="frequency"
          label="Frequency"
          units={['s', 'm', 'h']}
        />
      </I18nProvider>
    );
    fireEvent.change(screen.getByTestId('transformEditFlyoutFrequencyInput'), {
      target: { value: '20' },
    });

    expect(mockSetFormField).toHaveBeenLastCalledWith({ field: 'frequency', value: '20s' });
  });
});
