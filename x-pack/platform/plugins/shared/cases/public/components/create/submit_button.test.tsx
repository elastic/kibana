/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { SubmitCaseButton } from './submit_button';
import { renderWithTestingProviders } from '../../common/mock';

jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib');

describe('SubmitCaseButton', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-expect-error: not all properties are needed for testing
    jest.mocked(useFormContext).mockReturnValue({ submit: onSubmit, isSubmitting: false });
  });

  it('renders', async () => {
    renderWithTestingProviders(<SubmitCaseButton />);

    expect(await screen.findByTestId('create-case-submit')).toBeInTheDocument();
  });

  it('submits', async () => {
    renderWithTestingProviders(<SubmitCaseButton />);

    await userEvent.click(await screen.findByTestId('create-case-submit'));

    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('disables when submitting', async () => {
    // @ts-expect-error: not all properties are needed for testing
    jest.mocked(useFormContext).mockReturnValue({ submit: onSubmit, isSubmitting: true });
    renderWithTestingProviders(<SubmitCaseButton />);

    const button = await screen.findByTestId('create-case-submit');
    await userEvent.click(button);

    expect(await screen.findByTestId('create-case-submit')).toBeDisabled();
  });
});
