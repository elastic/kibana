/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';

import { SubmitCaseButton } from './submit_button';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import userEvent, { type UserEvent } from '@testing-library/user-event';

describe('SubmitCaseButton', () => {
  let user: UserEvent;
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <SubmitCaseButton />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('create-case-submit')).toBeInTheDocument();
  });

  it('submits', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <SubmitCaseButton />
      </FormTestComponent>
    );

    await user.click(await screen.findByTestId('create-case-submit'));

    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('disables when submitting', async () => {
    appMockRender.render(
      <FormTestComponent
        // We need to pass in an async variant in here,
        // otherwise the assertion will fail
        onSubmit={jest.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        })}
      >
        <SubmitCaseButton />
      </FormTestComponent>
    );

    const button = await screen.findByTestId('create-case-submit');
    await user.click(button);

    expect(await screen.findByTestId('create-case-submit')).toBeDisabled();
  });
});
