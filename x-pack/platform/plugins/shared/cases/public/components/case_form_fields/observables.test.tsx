/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { schema } from '../create/schema';
import { FormTestComponent } from '../../common/test_utils';
import { OBSERVABLE_TYPE_HOSTNAME } from '../../../common/constants/observables';
import { Observables } from './observables';
import { ObservablesToggle } from './observables_toggle';
import type { ObservablesProps } from './observables';
import type { FormTestComponentProps } from '../../common/test_utils';

const CASE_OBSERVABLES_TEST_ID = 'caseObservables';
const CASE_OBSERVABLES_INPUT_TEST_ID = 'comboBoxInput';
const CASE_OBSERVABLES_COMBO_BOX_TEST_ID = 'comboBoxToggleListButton';
const CASE_OBSERVABLES_COMBO_BOX_OPTIONS_LIST_TEST_ID =
  'comboBoxOptionsList caseObservablesComboBox-optionsList';
const setObservables = jest.fn();

const mockObservables = [
  {
    typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
    value: 'host1',
    description: null,
  },
  {
    typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
    value: 'host2',
    description: null,
  },
];

describe('Observables', () => {
  const onSubmit = jest.fn();
  const defaultFormProps = {
    onSubmit,
    formDefaultValue: { extractObservables: true },
    schema: {
      extractObservables: schema.extractObservables,
    },
  };

  const defaultProps = {
    isLoading: false,
    observables: mockObservables,
    selectedObservables: [
      {
        typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
        value: 'host1',
        description: null,
      },
    ],
    setObservables,
  };

  const renderObservables = (
    props?: Partial<ObservablesProps>,
    formProps?: Partial<FormTestComponentProps>
  ) => {
    render(
      <FormTestComponent {...defaultFormProps} {...formProps}>
        <ObservablesToggle isLoading={false} />
        <Observables {...defaultProps} {...props} />
      </FormTestComponent>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    renderObservables();

    const observables = await screen.findByTestId(CASE_OBSERVABLES_TEST_ID);
    expect(observables).toBeInTheDocument();

    // Renders selected observables correctly
    const host1 = await screen.findByText('Host name: host1');
    expect(host1).toBeInTheDocument();
    const host2 = screen.queryByText('Host name: host2');
    expect(host2).not.toBeInTheDocument();

    // Renders observables options correctly
    const observablesDropdown = await screen.findByTestId(CASE_OBSERVABLES_COMBO_BOX_TEST_ID);
    await userEvent.click(observablesDropdown);

    const optionList = await screen.findByTestId(CASE_OBSERVABLES_COMBO_BOX_OPTIONS_LIST_TEST_ID);
    expect(within(optionList).queryByText('Host name: host1')).not.toBeInTheDocument();
    expect(within(optionList).getByText('Host name: host2')).toBeInTheDocument();
  });

  it('it does not render when extractObservables is false', async () => {
    renderObservables(undefined, { formDefaultValue: { extractObservables: false } });
    const observables = screen.queryByTestId(CASE_OBSERVABLES_TEST_ID);
    expect(observables).not.toBeInTheDocument();
  });

  it('selects observables', async () => {
    renderObservables();

    const observablesDropdown = await screen.findByTestId(CASE_OBSERVABLES_COMBO_BOX_TEST_ID);
    await userEvent.click(observablesDropdown);

    const host1 = await screen.findByText('Host name: host2');
    await userEvent.click(host1);

    expect(setObservables).toHaveBeenCalledWith([
      {
        typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
        value: 'host1',
        description: null,
      },
      {
        typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
        value: 'host2',
        description: null,
      },
    ]);
  });

  it('does not render when observables are empty', async () => {
    renderObservables({ observables: [] });
    const observables = screen.queryByTestId(CASE_OBSERVABLES_TEST_ID);
    expect(observables).not.toBeInTheDocument();
  });

  it('renders a disabled dropdown when loading', async () => {
    renderObservables({ isLoading: true });
    const observablesInput = await screen.findByTestId(CASE_OBSERVABLES_INPUT_TEST_ID);
    expect(within(observablesInput).getByRole('combobox')).toBeDisabled();
  });
});
