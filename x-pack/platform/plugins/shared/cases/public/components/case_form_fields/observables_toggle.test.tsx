/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObservablesToggle } from './observables_toggle';
import { schema } from '../create/schema';
import { FormTestComponent } from '../../common/test_utils';

const CASE_OBSERVABLES_TOGGLE_TEST_ID = 'caseObservablesToggle';

describe('ObservablesToggle', () => {
  const onSubmit = jest.fn();
  const defaultFormProps = {
    onSubmit,
    formDefaultValue: { extractObservables: true },
    schema: {
      extractObservables: schema.extractObservables,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it render toggle correctly', async () => {
    render(
      <FormTestComponent>
        <ObservablesToggle isLoading={false} defaultValue={true} />
      </FormTestComponent>
    );

    const extractObservablesToggle = await screen.findByTestId(CASE_OBSERVABLES_TOGGLE_TEST_ID);
    expect(extractObservablesToggle).toBeInTheDocument();
    expect(within(extractObservablesToggle).getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(within(extractObservablesToggle).getByText('Extract observables')).toBeInTheDocument();
  });

  it('it toggles the switch', async () => {
    render(
      <FormTestComponent>
        <ObservablesToggle isLoading={false} />
      </FormTestComponent>
    );

    const extractObservablesToggle = await screen.findByTestId(CASE_OBSERVABLES_TOGGLE_TEST_ID);

    await userEvent.click(within(extractObservablesToggle).getByRole('switch'));
    expect(within(extractObservablesToggle).getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('renders disabled toggle when loading', async () => {
    render(
      <FormTestComponent {...defaultFormProps}>
        <ObservablesToggle isLoading={true} />
      </FormTestComponent>
    );
    const extractObservablesToggle = await screen.findByTestId(CASE_OBSERVABLES_TOGGLE_TEST_ID);
    expect(extractObservablesToggle).toBeInTheDocument();
    expect(within(extractObservablesToggle).getByRole('switch')).toBeDisabled();
  });
});
