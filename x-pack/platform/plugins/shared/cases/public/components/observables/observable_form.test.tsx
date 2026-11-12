/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObservableForm, type ObservableFormProps } from './observable_form';
import { renderWithTestingProviders } from '../../common/mock';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';

jest.mock('../../containers/configure/use_get_case_configuration');

describe('ObservableForm', () => {
  const props: ObservableFormProps = {
    isLoading: false,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useGetCaseConfiguration).mockReturnValue({
      data: { observableTypes: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCaseConfiguration>);
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<ObservableForm {...props} />);

    expect(screen.getByTestId('save-observable')).toBeInTheDocument();
  });

  it('lists each built-in type once and skips the built-in overrides of the configuration', async () => {
    const [builtinType] = OBSERVABLE_TYPES_BUILTIN;
    jest.mocked(useGetCaseConfiguration).mockReturnValue({
      data: {
        observableTypes: [
          { key: builtinType.key, label: builtinType.label, paths: [] },
          { key: 'employee-id', label: 'Employee ID' },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCaseConfiguration>);

    renderWithTestingProviders(<ObservableForm {...props} />);
    await userEvent.click(screen.getByTestId('observable-type-select'));

    const options = await screen.findAllByRole('option');
    expect(within(screen.getByRole('listbox')).getAllByText(builtinType.label)).toHaveLength(1);
    expect(options).toHaveLength(OBSERVABLE_TYPES_BUILTIN.length + 1);
    expect(screen.getByText('Employee ID')).toBeInTheDocument();
  });
});
